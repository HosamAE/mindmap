# Copyright (c) 2026 HosamAE
# Licensed under the GNU Lesser General Public License v3.0 or later (LGPL-3.0-or-later)
# See the LICENSE file in the project root for more information.

from odoo import fields, models


class MindMapDemo(models.Model):
    _name = "mindmap.demo"
    _inherit = ["mindmap.mixin"]
    _description = "Mind Map Strategic Plan"
    _parent_name = "mindmap_parent_id"
    _parent_store = True
    _rec_name = "name"

    name = fields.Char(string="Objective / Task", required=True)

    # Hierarchy (Need to override comodel from mixin)
    mindmap_parent_id = fields.Many2one("mindmap.demo", string="Parent Node", index=True, ondelete="cascade")
    mindmap_child_ids = fields.One2many("mindmap.demo", "mindmap_parent_id", string="Children Nodes")
    parent_path = fields.Char(index=True)

    # Visual Flair Data
    icon = fields.Char(string="FontAwesome Icon", default="fa-circle")

    progress = fields.Integer(string="Completion %", default=0)
    budget = fields.Float(string="Allocated Budget")

    state = fields.Selection([("idea", "Idea"), ("research", "Researching"), ("active", "In Progress"), ("blocked", "Blocked"), ("done", "Completed")], default="idea", string="Status")

    def icon_get(self):
        return self.icon or "fa-circle"
