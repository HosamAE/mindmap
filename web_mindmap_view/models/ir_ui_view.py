# Copyright (c) 2026 HosamAE
# Licensed under the GNU Lesser General Public License v3.0 or later (LGPL-3.0-or-later)
# See the LICENSE file in the project root for more information.

from typing import Any

from odoo import fields, models


class View(models.Model):
    _inherit = "ir.ui.view"

    type = fields.Selection(selection_add=[("mindmap", "Mind Map")])

    def _validate_tag_mindmap(self, node, name_manager, node_info):
        """Allow anything in mindmap view"""
        return True

    def _get_view_info(self):
        root: dict[str, Any] = super()._get_view_info()
        root["mindmap"] = {"icon": "fa fa-sitemap", "multi_record": True}
        return root

    def _is_qweb_based_view(self, view_type):
        return view_type == "mindmap" or super()._is_qweb_based_view(view_type)
