# Copyright (c) 2026 HosamAE
# Licensed under the GNU Lesser General Public License v3.0 or later (LGPL-3.0-or-later)
# See the LICENSE file in the project root for more information.

{
    "name": "Tree/MindMap View (Arborization)",
    "version": "18.0.1.0.0",
    "category": "Hidden/Tools",
    "summary": "Advanced Mind Map & Tree Visualization View",
    "description": """
This module adds a new view type 'mindmap' to Odoo.
It allows visualizing recursive models in a Mind Map interface.
Features:
- Root, Branch, Leaf visualization.
- Expand/Collapse levels.
- Side Panel editing.
- Drag & Drop (planned).

Author: HosamAE
    """,
    "author": "HosamAE",
    "depends": ["web"],
    "data": [
        "security/ir.model.access.csv",
        "views/templates.xml",
        "views/mindmap_views.xml",
    ],
    "assets": {
        "web.assets_backend": [
            "web_mindmap_view/static/src/mindmap_view/mindmap_model.js",
            "web_mindmap_view/static/src/mindmap_view/mindmap_node.js",
            "web_mindmap_view/static/src/mindmap_view/mindmap_renderer.js",
            "web_mindmap_view/static/src/mindmap_view/mindmap_controller.js",
            "web_mindmap_view/static/src/mindmap_view/mindmap_arch_parser.js",
            "web_mindmap_view/static/src/mindmap_view/mindmap_side_panel.js",
            "web_mindmap_view/static/src/mindmap_view/mindmap_view.js",
            "web_mindmap_view/static/src/mindmap_view/mindmap_field.js",
            "web_mindmap_view/static/src/mindmap_view/*.xml",
            "web_mindmap_view/static/src/mindmap_view/mindmap_view.scss",
        ],
        "web.assets_web_dark": [
            "web_mindmap_view/static/src/mindmap_view/mindmap_view.dark.scss",
        ],
    },
    "license": "LGPL-3",
    "images": ["static/description/screenshot_canvas.png"],
    "installable": True,
    "application": False,
}
