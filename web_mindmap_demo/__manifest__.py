# Copyright (c) 2026 HosamAE
# Licensed under the GNU Lesser General Public License v3.0 or later (LGPL-3.0-or-later)
# See the LICENSE file in the project root for more information.

{
    "name": "Tree/MindMap Demo",
    "version": "18.0.1.0.0",
    "category": "Hidden/Tools",
    "summary": "Demo data for Mind Map View",
    "description": """
    Showcases the capabilities of the web_mindmap_view module
    with a rich dataset (Corporate Strategy Example).
    """,
    "author": "HosamAE",
    "depends": ["web_mindmap_view"],
    "data": [
        "security/ir.model.access.csv",
        "views/demo_mindmap.xml",
    ],
    "installable": True,
    "application": False,
    "license": "LGPL-3",
}
