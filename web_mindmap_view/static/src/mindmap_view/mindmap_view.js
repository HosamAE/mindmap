/** @odoo-module */
/*
 * Copyright (c) 2026 HosamAE
 * Licensed under the GNU Lesser General Public License v3.0 or later (LGPL-3.0-or-later)
 * See the LICENSE file in the project root for more information.
 */

import { registry } from '@web/core/registry';
import { MindMapController } from './mindmap_controller';
import { MindMapArchParser } from './mindmap_arch_parser';
import { MindMapModel } from './mindmap_model';
import { MindMapRenderer } from './mindmap_renderer';

export const mindMapView = {
  type: 'mindmap',
  display_name: 'MindMap',
  icon: 'fa fa-sitemap',
  multiRecord: true,
  Controller: MindMapController,
  Model: MindMapModel,
  Renderer: MindMapRenderer,
  ArchParser: MindMapArchParser,
  props: (genericProps, view) => {
    const { arch, relatedModels, resModel } = genericProps;
    const { ArchParser } = view;
    const archInfo = new ArchParser().parse(arch, relatedModels, resModel);

    return {
      ...genericProps,
      Model: view.Model,
      Renderer: view.Renderer,
      archInfo,
      searchMenuTypes: ['filter', 'favorite'],
      display: {
        controlPanel: { 'top-right': true, 'bottom-right': true },
        searchPanel: true,
      },
    };
  },
};

registry.category('views').add('mindmap', mindMapView);
