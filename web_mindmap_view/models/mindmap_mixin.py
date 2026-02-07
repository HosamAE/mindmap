# -*- coding: utf-8 -*-
# -*- coding: utf-8 -*-
# Copyright (c) 2026 HosamAE
# Licensed under the GNU Lesser General Public License v3.0 or later (LGPL-3.0-or-later)
# See the LICENSE file in the project root for more information.

from odoo import api, fields, models


class MindMapTemplate(models.Model):
    _name = "mindmap.template"
    _description = "Mindmap Hover Card Template"

    name = fields.Char(required=True)
    field_ids = fields.Many2many("ir.model.fields", string="Display Fields", domain="[('model_id.model', '=', model_name)]", help="Fields to display in the hover card")
    model_id = fields.Many2one("ir.model", string="Model", required=True, ondelete="cascade")
    model_name = fields.Char(related="model_id.model", readonly=True)


class MindMapMixin(models.AbstractModel):
    _name = "mindmap.mixin"
    _description = "Mindmap Mixin"

    mindmap_parent_id = fields.Many2one(_name, string="Parent Node", index=True, ondelete="cascade")
    mindmap_child_ids = fields.One2many(_name, "mindmap_parent_id", string="Children Nodes")
    mindmap_color = fields.Char(string="Node Color", default="#dee2e6")
    mindmap_description = fields.Text(string="Mindmap Description")
    mindmap_model_name = fields.Char(compute="_compute_mindmap_model_name")

    mindmap_template_id = fields.Many2one("mindmap.template", string="Hover Template", domain="[('model_id.model', '=', mindmap_model_name)]")

    def _compute_mindmap_model_name(self):
        for rec in self:
            rec.mindmap_model_name = rec._name

    def get_mindmap_card_data(self):
        """Returns a list of dicts {label, value} based on the template"""
        self.ensure_one()
        if not self.mindmap_template_id:
            return []

        data = []
        for field_rec in self.mindmap_template_id.field_ids:
            field_name = field_rec.name
            value = self[field_name]
            # Format value if necessary (e.g. selection, many2one)
            if field_rec.ttype == "many2one":
                value = value.display_name if value else ""
            elif field_rec.ttype == "selection":
                # Safely get selection attribute from the Odoo field
                field_obj = self._fields.get(field_name)
                selection = getattr(field_obj, "selection", [])
                if callable(selection):
                    selection = selection(self.env[self._name])

                # dict() expects an iterable of pairs; ensure it is one
                if isinstance(selection, (list, tuple)):
                    value = dict(selection).get(value) if value else ""
                else:
                    value = value or ""

            data.append({"label": field_rec.field_description, "value": value, "name": field_rec.name})
        return data
