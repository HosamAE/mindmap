/** @odoo-module */
/*
 * Copyright (c) 2026 HosamAE
 * Licensed under the GNU Lesser General Public License v3.0 or later (LGPL-3.0-or-later)
 * See the LICENSE file in the project root for more information.
 */

import { registry } from '@web/core/registry';
import { useService } from '@web/core/utils/hooks';
import { X2ManyField, x2ManyField } from '@web/views/fields/x2many/x2many_field';
import { MindMapRenderer } from './mindmap_renderer';
import { MindMapModel } from './mindmap_model';
import { useRecordObserver } from '@web/model/relational_model/utils';
import { onWillUpdateProps, EventBus, useSubEnv, useState } from '@odoo/owl';
import { FormViewDialog } from '@web/views/view_dialogs/form_view_dialog';
import { ConfirmationDialog } from '@web/core/confirmation_dialog/confirmation_dialog';

export class MindMapField extends X2ManyField {
  static template = 'web_mindmap_view.MindMapField';
  static components = { ...X2ManyField.components, MindMapRenderer };

  setup() {
    super.setup();
    this.actionService = useService('action');
    this.dialogService = useService('dialog');
    this.orm = useService('orm');

    // Collect services needed by MindMapModel
    const services = {};
    for (const key of MindMapModel.services || []) {
      services[key] = useService(key);
    }

    // Instantiate MindMapModel with correct Odoo 18 signature: constructor(env, params, services)
    this.mindMapModel = new MindMapModel(
      this.env,
      {
        config: this.list.config,
        archInfo: this.archInfo,
      },
      services,
    );

    this.mindMapModel.root = this.list;
    this.mindMapModel.updateConfig(this.archInfo);

    // Setup Event Bus for Node Interactions
    this.mindMapBus = new EventBus();

    // In One2many (Field) context, we behave like a standard list/kanban:
    // - Click (open_settings from Node) -> Open Form Dialog
    // - Create Child -> Open Form Dialog with default_parent
    // - Delete -> Confirm & Delete
    this.mindMapBus.addEventListener('open_record', this.onNodeClicked.bind(this));
    this.mindMapBus.addEventListener('open_settings', this.onNodeClicked.bind(this)); // Redirect Settings Click to Open Record
    this.mindMapBus.addEventListener('create_child', this.onCreateChild.bind(this));
    this.mindMapBus.addEventListener('delete_record', this.onDeleteRecord.bind(this));
    useSubEnv({ mindMapBus: this.mindMapBus });

    this.sidePanelState = useState({
      isOpen: false, // Always false/unused in Field context
    });

    // Trigger buildTree (with descendants fetch) whenever the set of records changes
    useRecordObserver((record) => {
      // Extract IDs from current records
      const ids = this.list.records.map((r) => r.resId || r.id);
      this.mindMapModel.fetchDescendants(ids);
    });

    onWillUpdateProps((nextProps) => {
      // Re-apply archInfo if it changes (e.g. options update)
      const nextArchInfo = nextProps.views?.[nextProps.viewMode] || {};
      if (JSON.stringify(nextArchInfo) !== JSON.stringify(this.archInfo)) {
        this.mindMapModel.updateConfig(nextArchInfo);
        // Also refetch to be safe
        const ids = this.list.records.map((r) => r.resId || r.id);
        this.mindMapModel.fetchDescendants(ids);
      }
    });

    // Initial load
    const initialIds = this.list.records.map((r) => r.resId || r.id);
    this.mindMapModel.fetchDescendants(initialIds);

    // Forces unique render key to ensure hard-refresh on demand
    this.renderState = useState({ key: 0 });
  }

  get rendererProps() {
    const props = super.rendererProps;
    return {
      ...props,
      model: this.mindMapModel,
      archInfo: this.archInfo,
      // Fix: Use custom logic to ensure refresh happens
      createRecord: this.createRootNode.bind(this),
      // Force re-render when key changes
      key: this.renderState.key,
    };
  }

  async createRootNode() {
    // Explicitly open FormViewDialog to handle onRecordSaved -> Refresh
    this.dialogService.add(FormViewDialog, {
      resModel: this.list.resModel,
      context: this.list.context,
      title: 'Create Root Node',
      onRecordSaved: async (record) => {
        // 1. Reload parent model to get fresh list
        await this.list.model.load();

        // 2. Fetch descendants using the NEW list
        // Note: Access model.root.records directly to bypass potentially stale 'this.list' prop
        let freshRecords = this.list.model.root.records || this.list.records;

        // CRITICAL FIX: If the DB read replica is lagging, the new record might NOT be in the loaded list yet.
        // We manually inject it if missing because we KNOW it exists (we just saved it).
        const newResId = record.resId || record.id;
        if (newResId && !freshRecords.find((r) => (r.resId || r.id) === newResId)) {
          // Construct a lightweight record object for the model
          const newRecord = {
            id: newResId,
            resId: newResId,
            data: record.data, // This contains the visible fields
            model: this.list.model, // Ref to model
          };
          // Append to our local list ref so buildTree sees it
          freshRecords = [...freshRecords, newRecord];
          // Also hack the model's internal list to avoid "popping" out on next weak reload?
          // Better not mess with model internals too much, but passing it to mindMapModel is safe.
        }

        const ids = freshRecords.map((r) => r.resId || r.id);

        // Update model root text ref just in case
        this.mindMapModel.root = { ...this.list, records: freshRecords };

        await this.mindMapModel.fetchDescendants(ids);
        this.renderState.key++; // Force hard refresh
      },
    });
  }

  async onNodeClicked(event) {
    const record = event.detail !== undefined ? event.detail : event;
    const resId = record.resId || record.id;

    if (resId) {
      // Manual Dialog to ensure we catch the save event for refresh
      this.dialogService.add(FormViewDialog, {
        resModel: this.list.resModel,
        resId: resId,
        title: record.data.display_name,
        context: this.list.context,
        onRecordSaved: async (record) => {
          await this.list.model.load();

          let freshRecords = this.list.model.root.records || this.list.records;

          // CRITICAL FIX: Manually update the modified record in our local list
          // This ensures name changes etc. are reflected immediately even if DB read lags.
          const savedResId = record.resId || record.id;
          freshRecords = freshRecords.map((r) => {
            if ((r.resId || r.id) === savedResId) {
              return { ...r, data: { ...r.data, ...record.data } };
            }
            return r;
          });

          const ids = freshRecords.map((r) => r.resId || r.id);
          // Sync root
          this.mindMapModel.root = { ...this.list, records: freshRecords };

          await this.mindMapModel.fetchDescendants(ids);
          this.renderState.key++; // Force hard refresh
        },
      });
    }
  }

  async onCreateChild(event) {
    const parentRecord = event.detail !== undefined ? event.detail : event;
    const parentField = this.archInfo.parentField || 'parent_id';

    if (!parentRecord) return;

    const parentId = parentRecord.resId || parentRecord.id;

    // Explicitly open FormViewDialog to handle onRecordSaved -> Refresh
    this.dialogService.add(FormViewDialog, {
      resModel: this.list.resModel,
      context: {
        ...this.list.context,
        [`default_${parentField}`]: parentId,
      },
      title: 'Create Child Node',
      onRecordSaved: async (record) => {
        await this.list.model.load();

        let freshRecords = this.list.model.root.records || this.list.records;
        // Inject if missing (Lag Protection)
        const newResId = record.resId || record.id;
        if (newResId && !freshRecords.find((r) => (r.resId || r.id) === newResId)) {
          const newRecord = { id: newResId, resId: newResId, data: record.data, model: this.list.model };
          freshRecords = [...freshRecords, newRecord];
        }

        const ids = freshRecords.map((r) => r.resId || r.id);
        // Sync root
        this.mindMapModel.root = { ...this.list, records: freshRecords };

        await this.mindMapModel.fetchDescendants(ids);

        // Behavior Parity: Expand the parent node so the new child is visible!
        // We force expansion BEFORE the key update so the new render sees it expanded
        this.mindMapModel.expandNodeByResId(parentId);

        this.renderState.key++; // Force hard refresh
      },
    });
  }

  async onDeleteRecord(event) {
    const record = event.detail !== undefined ? event.detail : event;
    const resId = record.resId || record.id;

    if (!resId) return;

    this.dialogService.add(ConfirmationDialog, {
      body: `Are you sure you want to delete "${record.data.display_name}"?`,
      confirm: async () => {
        try {
          // Use ORM unlink.
          if (typeof resId === 'number') {
            await this.orm.unlink(this.list.resModel, [resId]);
          }
          await this.list.model.load();

          let freshRecords = this.list.model.root.records || this.list.records;

          // CRITICAL FIX: Manually remove the deleted record if it's still lingering due to lag
          freshRecords = freshRecords.filter((r) => (r.resId || r.id) !== resId);

          const ids = freshRecords.map((r) => r.resId || r.id);
          // Sync root
          this.mindMapModel.root = { ...this.list, records: freshRecords };

          await this.mindMapModel.fetchDescendants(ids);
          this.renderState.key++; // Force hard refresh
        } catch (e) {
          console.error('Failed to delete record', e);
        }
      },
      cancel: () => {},
    });
  }
}

export const mindMapField = {
  ...x2ManyField,
  component: MindMapField,
  additionalClasses: ['o_field_mindmap', 'o_mindmap_view'],
};

registry.category('fields').add('mindmap', mindMapField);
