/** @odoo-module */
/*
 * Copyright (c) 2026 HosamAE
 * Licensed under the GNU Lesser General Public License v3.0 or later (LGPL-3.0-or-later)
 * See the LICENSE file in the project root for more information.
 */

import { Component, useState, useEffect } from '@odoo/owl';

export class MindMapNode extends Component {
  setup() {
    this.model = useState(this.props.model);
    this.expansionState = useState(this.model.getExpansionState(this.props.node.resId));
    this.state = useState({
      isHovered: false,
      wasExpanded: this.expansionState.isExpanded,
    });

    useEffect(
      () => {
        if (this.expansionState.isExpanded) {
          this.state.wasExpanded = true;
        }
      },
      () => [this.expansionState.isExpanded],
    );
  }

  get node() {
    // Always fetch from the model's reactive nodeMap to stay in sync with background updates
    return this.model.nodeMap[this.props.node.resId] || this.props.node;
  }

  get hasChildren() {
    return this.node.children && this.node.children.length > 0;
  }

  get isExpanded() {
    return this.expansionState.isExpanded;
  }

  get isHighlighted() {
    return this.model.highlightedResIds && this.model.highlightedResIds.has(this.props.node.resId);
  }

  onNodeClick() {
    if (!this.props.archInfo.canEdit) {
      return;
    }
    // Open Settings View via Side Panel (Controller)
    this.env.mindMapBus.trigger('open_settings', this.props.node);
  }

  onToggleClick() {
    this.props.model.toggleNode(this.props.node.resId);
  }

  onAddChildClick() {
    if (this.props.archInfo.canCreate) {
      this.env.mindMapBus.trigger('create_child', this.props.node);
    }
  }

  onDeleteClick() {
    if (this.props.archInfo.canDelete) {
      this.env.mindMapBus.trigger('delete_record', this.props.node);
    }
  }

  onSettingsClick() {
    if (this.props.archInfo.canEdit) {
      this.env.mindMapBus.trigger('open_settings', this.props.node);
    }
  }

  async onMouseEnter() {
    this.hoverTimeout = setTimeout(async () => {
      await this.props.model.loadNodeExtraData(this.props.node.resId);
      this.state.isHovered = true;
    }, 300); // 300ms delay for "on-the-fly" feel
  }

  onMouseLeave() {
    clearTimeout(this.hoverTimeout);
    this.state.isHovered = false;
  }

  get nodeColor() {
    return this.node.data.mindmap_color_hex || '#dee2e6';
  }
}

/**
 * Universal Hover Card that renders data from the mindmap mixin template
 */
export class MindMapHoverCard extends Component {
  static template = 'web_mindmap_view.MindMapHoverCard';
}

MindMapNode.template = 'web_mindmap_view.MindMapNode';
MindMapNode.components = { MindMapNode, MindMapHoverCard };
MindMapNode.props = {
  node: Object,
  model: Object,
  archInfo: Object,
  CardComponent: { type: Function, optional: true },
  isRoot: { type: Boolean, optional: true },
};
