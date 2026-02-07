/** @odoo-module */
/*
 * Copyright (c) 2026 HosamAE
 * Licensed under the GNU Lesser General Public License v3.0 or later (LGPL-3.0-or-later)
 * See the LICENSE file in the project root for more information.
 */

import { Component, xml, useState } from '@odoo/owl';
import { MindMapNode } from './mindmap_node';

export class MindMapRenderer extends Component {
  setup() {
    this.model = useState(this.props.model || this.props.list);

    // Support for field usage where the model might not have buildTree
    if (this.props.list && !this.model.buildTree) {
      this._setupFieldModel();
    }
    this.CardComponent = null;
    this.searchTimeout = null;
    if (this.props.archInfo && this.props.archInfo.template) {
      class CardComponent extends Component {
        get record() {
          return this.props.record || {};
        }
      }

      try {
        let processedTemplate = this.props.archInfo.template;
        // Pre-process: Replace <field name="xxx"/> with <t t-esc="props.record.xxx"/>
        // Note: props.record because it's passed as a prop to the CardComponent
        processedTemplate = processedTemplate.replace(/<field\s+name="([^"]+)"\s*\/>/g, '<span t-esc="props.record.$1"/>');
        processedTemplate = processedTemplate.replace(/<field\s+name="([^"]+)"\s*><\/field>/g, '<span t-esc="props.record.$1"/>');

        CardComponent.template = xml`${processedTemplate}`;
        this.CardComponent = CardComponent;
      } catch (e) {
        console.error('[MindMapRenderer] Failed to create CardComponent:', e);
      }
    }
  }

  _setupFieldModel() {
    // If used as a field widget, we might need to trigger tree building
    // whenever the records change.
    const list = this.props.list;

    // Add necessary reactive state if not present
    if (!this.model.rootNodes) {
      this.model.rootNodes = [];
      this.model.nodeMap = {};
    }

    // We can't easily use the full MindMapModel logic here without refactoring it
    // but we can try to call a shared build tree logic if we extract it.
    // For now, let's ensure the renderer can at least handle the basic structure.
  }

  onSearchInput(ev) {
    const value = ev.target.value;
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.searchTimeout = setTimeout(() => {
      if (this.model.load) {
        const domain = value ? [['name', 'ilike', value]] : [];
        this.model.load({ domain });
      } else if (this.props.list) {
        // Handle search for X2Many list if possible, or just local filter
        this.props.list.load({ domain: value ? [['name', 'ilike', value]] : [] });
      }
    }, 400);
  }

  clearHighlights() {
    this.model.clearHighlights();
  }
}

MindMapRenderer.template = 'web_mindmap_view.MindMapRenderer';
MindMapRenderer.components = { MindMapNode };
