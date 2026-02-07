/** @odoo-module */
/*
 * Copyright (c) 2026 HosamAE
 * Licensed under the GNU Lesser General Public License v3.0 or later (LGPL-3.0-or-later)
 * See the LICENSE file in the project root for more information.
 */

import { Component, useState, useSubEnv, onWillStart, EventBus } from '@odoo/owl';
import { Layout } from '@web/search/layout';
import { useModel } from '@web/model/model';
import { MindMapModel } from './mindmap_model';
import { useService } from '@web/core/utils/hooks';
import { FormViewDialog } from '@web/views/view_dialogs/form_view_dialog';
import { ConfirmationDialog } from '@web/core/confirmation_dialog/confirmation_dialog';
import { MindMapSidePanel } from './mindmap_side_panel';

export class MindMapController extends Component {
  static template = 'web_mindmap_view.MindMapController';
  static components = { Layout, MindMapSidePanel };

  setup() {
    this.actionService = useService('action');
    this.dialogService = useService('dialog');
    this.orm = useService('orm');

    this.state = useState({
      renderKey: 1,
    });
    this.sidePanelState = useState({
      isOpen: false,
      resId: null,
      viewId: null,
      recordName: '',
      canEdit: this.props.archInfo.canEdit,
    });

    // Instantiate the model explicitly
    this.model = useModel(this.props.Model, this.modelParams);

    // Setup Event Bus for Node Interactions
    const mindMapBus = new EventBus();
    mindMapBus.addEventListener('open_record', this.onNodeClicked.bind(this));
    mindMapBus.addEventListener('open_settings', this.onSettingsClicked.bind(this));
    mindMapBus.addEventListener('create_child', this.onCreateChild.bind(this));
    mindMapBus.addEventListener('delete_record', this.onDeleteRecord.bind(this));
    useSubEnv({ mindMapBus });

    this.resolvedViewIds = {};
    this.closeSidePanel = this.closeSidePanel.bind(this);
    this.onSettingsSaved = this.onSettingsSaved.bind(this);
    this.createRecord = this.createRecord.bind(this);
  }

  get modelParams() {
    const { resModel, archInfo, limit, state } = this.props;

    // Manually construct activeFields to fetch
    const activeFields = {};
    const fieldsToCheck = ['display_name', archInfo.parentField, archInfo.childField, ...(archInfo.fieldNames || [])];

    for (const fieldName of fieldsToCheck) {
      if (fieldName && this.props.fields[fieldName]) {
        activeFields[fieldName] = {
          name: fieldName,
          type: this.props.fields[fieldName].type,
        };
      }
    }

    const modelConfig = state?.modelState?.config || {
      resModel,
      activeFields,
      fields: this.props.fields,
    };

    return {
      config: modelConfig,
      state: state?.modelState,
      limit: archInfo.limit || limit || 80,
      archInfo,
    };
  }

  get modelState() {
    return this.model.root;
  }

  async onNodeClicked(event) {
    const record = event.detail !== undefined ? event.detail : event;
    const resId = record.resId || record.id;

    if (resId) {
      this.dialogService.add(FormViewDialog, {
        resModel: this.props.resModel,
        resId: resId,
        title: record.data.display_name,
        onRecordSaved: async () => {
          await this.model.load(this.modelParams);
        },
      });
    }
  }

  async onSettingsClicked(event) {
    const record = event.detail !== undefined ? event.detail : event;
    const resId = record.resId || record.id;
    let viewId = this.props.archInfo.settingsViewId;

    // Resolve XML ID to database ID
    if (resId) {
      if (typeof viewId === 'string' && viewId.includes('.')) {
        if (this.resolvedViewIds[viewId]) {
          viewId = this.resolvedViewIds[viewId];
        } else {
          try {
            const resolvedId = await this.orm.call('ir.model.data', 'xmlid_to_res_id', [viewId]);
            this.resolvedViewIds[viewId] = resolvedId;
            viewId = resolvedId;
          } catch (e) {
            viewId = undefined;
          }
        }
      }

      this.sidePanelState.resId = resId;
      this.sidePanelState.viewId = typeof viewId === 'number' ? viewId : undefined;
      this.sidePanelState.recordName = record.data.display_name;
      this.sidePanelState.resModel = this.props.resModel;
      this.sidePanelState.isOpen = true;
    }
  }

  async onSettingsSaved() {
    await this.model.load();
    this.state.renderKey++; // Force Renderer re-render
  }

  get sidePanelProps() {
    const props = {
      resModel: this.props.resModel,
      resId: this.sidePanelState.resId,
      viewId: this.sidePanelState.viewId,
      canEdit: this.sidePanelState.canEdit,
      onSaved: this.onSettingsSaved.bind(this),
      onClose: this.closeSidePanel.bind(this),
      onOpenFull: () => this.onNodeClicked({ resId: this.sidePanelState.resId, data: { display_name: this.sidePanelState.recordName } }),
    };

    // If no specific view ID but we have side_panel_fields, construct an inline view
    if (!props.viewId && this.props.archInfo.sidePanelFields && this.props.archInfo.sidePanelFields.length > 0) {
      const fieldNodes = this.props.archInfo.sidePanelFields.map((f) => `<field name="${f}"/>`).join('');
      props.arch = `
        <form>
          <sheet>
            <group>
              ${fieldNodes}
            </group>
          </sheet>
        </form>
      `;
      // We need to pass the fields definition.
      // The controller props.fields contains the fields definitions for the view.
      props.fields = this.props.fields;
    }

    return props;
  }

  closeSidePanel() {
    this.sidePanelState.isOpen = false;
  }

  async onCreateChild(event) {
    const parentRecord = event.detail !== undefined ? event.detail : event;
    const parentField = this.props.archInfo.parentField || 'parent_id';

    if (!parentRecord) return;

    const parentId = parentRecord.resId || parentRecord.id;

    this.dialogService.add(FormViewDialog, {
      resModel: this.props.resModel,
      context: {
        [`default_${parentField}`]: parentId,
      },
      onRecordSaved: async () => {
        await this.model.load(this.modelParams);
        // After loading, ensure the parent is expanded so the new child is visible
        this.model.expandNodeByResId(parentId);
      },
    });
  }

  async onDeleteRecord(event) {
    const record = event.detail !== undefined ? event.detail : event;
    const resId = record.resId || record.id;

    if (!resId) return;

    this.dialogService.add(ConfirmationDialog, {
      body: `Are you sure you want to delete "${record.data.display_name}" (ID: ${resId}) and all its children?`,
      confirm: async () => {
        await this.model.deleteRecord(resId);
        await this.model.load(this.modelParams);
      },
      cancel: () => {},
    });
  }

  async createRecord() {
    this.dialogService.add(FormViewDialog, {
      resModel: this.props.resModel,
      onRecordSaved: async () => {
        await this.model.load(this.modelParams);
      },
    });
  }
}
