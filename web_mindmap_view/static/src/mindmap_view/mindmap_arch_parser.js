/** @odoo-module */
/*
 * Copyright (c) 2026 HosamAE
 * Licensed under the GNU Lesser General Public License v3.0 or later (LGPL-3.0-or-later)
 * See the LICENSE file in the project root for more information.
 */

import { visitXML } from '@web/core/utils/xml';
import { Field } from '@web/views/fields/field';
import { getActiveActions } from '@web/views/utils';

export class MindMapArchParser {
  parse(arch, models, modelName) {
    const rootNode = arch.tagName ? arch : arch.documentElement || arch;

    const defaultDepthValue = rootNode.getAttribute('default_depth') || '2';
    const readonly = rootNode.getAttribute('readonly') === '1';
    const archInfo = {
      parentField: rootNode.getAttribute('parent_field') || 'parent_id',
      childField: rootNode.getAttribute('child_field') || 'child_ids',
      defaultDepth: ['root', 'leaf', 'leave', 'all'].includes(defaultDepthValue) ? defaultDepthValue : parseInt(defaultDepthValue) || 2,
      settingsViewId: rootNode.getAttribute('settings_view_id') || null,
      sidePanelFields: rootNode.getAttribute('side_panel_fields')
        ? rootNode
            .getAttribute('side_panel_fields')
            .split(',')
            .map((f) => f.trim())
        : [],
      canCreate: !readonly && rootNode.getAttribute('create') !== '0',
      canEdit: !readonly && rootNode.getAttribute('edit') !== '0',
      canDelete: !readonly && rootNode.getAttribute('delete') !== '0',
      invisible: rootNode.getAttribute('invisible') === '1',
      fieldNames: [],
    };

    archInfo.fieldNodes = {};
    archInfo.activeActions = getActiveActions(rootNode);

    // Collect ALL fields from the entire arch (including those inside <templates>)
    const allFieldNodes = arch.querySelectorAll('field');
    allFieldNodes.forEach((node) => {
      const fieldInfo = Field.parseFieldNode(node, models, modelName, 'mindmap');
      const fieldId = fieldInfo.name;
      if (!archInfo.fieldNodes[fieldId]) {
        archInfo.fieldNodes[fieldId] = fieldInfo;
      }
      node.setAttribute('field_id', fieldId);
    });

    const fieldNames = Object.values(archInfo.fieldNodes).map((f) => f.name);
    if (!fieldNames.includes('display_name')) {
      fieldNames.push('display_name');
    }
    archInfo.fieldNames = fieldNames;

    // Extract Template separately using standard DOM
    const templates = arch.getElementsByTagName('templates');
    if (templates.length > 0) {
      // Look for the specific template inside the first <templates> block
      const template = templates[0].querySelector("[t-name='mindmap-box']");
      if (template) {
        archInfo.template = template.outerHTML;
      }
    }

    return archInfo;
  }
}
