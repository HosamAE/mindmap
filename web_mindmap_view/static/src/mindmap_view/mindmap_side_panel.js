/** @odoo-module */
/*
 * Copyright (c) 2026 HosamAE
 * Licensed under the GNU Lesser General Public License v3.0 or later (LGPL-3.0-or-later)
 * See the LICENSE file in the project root for more information.
 */

import { Component, useState, onWillStart, useRef, useEffect } from '@odoo/owl';
import { View } from '@web/views/view';
import { useService } from '@web/core/utils/hooks';

export class MindMapSidePanel extends Component {
  static template = 'web_mindmap_view.MindMapSidePanel';
  static components = { View };

  setup() {
    this.viewRef = useRef('view');
    this.state = useState({
      isMounted: false,
      isDirty: false,
    });

    useEffect(
      () => {
        const onKeyDown = (ev) => {
          if (ev.key === 'Escape') {
            this.close();
          }
        };
        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
      },
      () => [],
    );

    onWillStart(async () => {
      // Pre-load if needed
    });

    // Smart Dirty state detector: We check if the hidden Odoo save button is enabled
    // This is the most reliable way to sync with Odoo's internal form logic
    this.dirtyTimer = setInterval(() => {
      if (this.viewRef.el) {
        const saveBtn = this.viewRef.el.querySelector('.o_form_button_save');
        const isDirty = saveBtn && !saveBtn.hasAttribute('disabled');
        if (this.state.isDirty !== isDirty) {
          this.state.isDirty = isDirty;
        }
      }
    }, 300);
  }

  // Cleanup the timer
  onWillUnmount() {
    if (this.dirtyTimer) {
      clearInterval(this.dirtyTimer);
    }
  }

  get viewProps() {
    return {
      resModel: this.props.resModel,
      resId: this.props.resId,
      type: 'form',
      viewId: this.props.viewId,
      arch: this.props.arch,
      fields: this.props.fields,
      readonly: !this.props.canEdit,
      onSave: (record) => {
        // This is called AFTER the internal save succeeds
        this.props.onSaved();
        this.close();
      },
      display: {
        controlPanel: true, // Let Odoo render it, we hide it via CSS
      },
    };
  }

  async saveAndClose() {
    // Try to trigger the save on the internal View component.
    const saveBtn = this.viewRef.el.querySelector('.o_form_button_save');
    if (saveBtn) {
      saveBtn.click();
    }
  }

  openFullForm() {
    this.env.services.action.doAction({
      type: 'ir.actions.act_window',
      res_model: this.props.resModel,
      res_id: this.props.resId,
      views: [[this.props.viewId || false, 'form']],
      target: 'current', // Full screen
    });
    this.close();
  }

  close() {
    this.props.onClose();
  }
}
