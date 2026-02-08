# Odoo Mind Map View

**Transform your data relationships into interactive, hierarchical Mind Maps.**

The `web_mindmap_view` module introduces a powerful new view type `mindmap` and a form widget `mindmap` to Odoo 17/18. It allows users to visualize, edit, and navigate complex parent-child relationships (like hierarchies, organizational charts, project tasks, or categories) in a beautiful, infinite-canvas style interface.

## 🌟 Key Features

- **Interactive Visualization**: Render standard Odoo records as an interactive mind map.
- **One2many Support**: Use the mind map as a widget (`widget="mindmap"`) inside any Form View to manage related records.
- **Drag & Drop (Planned)**: _Future support for reordering._
- **Search & Highlight**: Deep search that highlights the path to the root for any matching node.
- **Side Panel Inspector**: A dedicated side panel for editing node details without leaving the view.
- **Customizable Side Panel**: Define exactly which fields or view to show in the inspector.
- **Dark Mode**: Fully distinct, premium Dark Mode support.
- **Add Root & Children**: Easily create new root nodes or append children with a click.

![Strategy Board](static/description/assets/screenshot_01.png)

## 📦 Installation

1.  Clone/Download this module into your Odoo addons path.
2.  Install `web_mindmap_view` from the Apps menu.
3.  (Optional) Install `web_mindmap_demo` to see a live example.

## 🚀 Usage

### 1. As a Standalone View

Define a `mindmap` view in your XML. You must specify:

- `parent_field`: The Many2one field pointing to the parent.
- `child_field`: The One2many field pointing to children.

```xml
<record id="view_mindmap_project_task" model="ir.ui.view">
    <field name="name">project.task.mindmap</field>
    <field name="model">project.task</field>
    <field name="arch" type="xml">
        <mindmap parent_field="parent_id" child_field="child_ids" default_depth="2">
            <!-- Custom QWeb Template for Node Content -->
            <templates>
                <t t-name="mindmap-box">
                    <div class="o_mindmap_card_content">
                        <!-- You can use valid Odoo fields here -->
                        <div class="fw-bold"><field name="name"/></div>
                        <div class="text-muted small">
                            <i class="fa fa-user me-1"/> <field name="user_id"/>
                        </div>
                    </div>
                </t>
            </templates>
        </mindmap>
    </field>
</record>
```

#### Side Panel Customization

You can customize what appears in the right-side inspector pane when a node is clicked (edit mode).

**Option A: Simple Fields List**
Use `side_panel_fields` to quickly list fields.

```xml
<mindmap side_panel_fields="name, user_id, date_deadline, tag_ids" ... >
```

**Option B: Specific View**
Use `settings_view_id` to point to a specific form view XML ID.

```xml
<mindmap settings_view_id="my_module.view_task_mindmap_form" ... >
```

### 2. As a One2many Field Widget

You can use the Mind Map to manage a One2many relation directly inside a Form View.

```xml
<field name="sub_tasks" widget="mindmap"
       context="{'default_project_id': active_id}"/>
```

**Note**: In Widget mode, the Side Panel is disabled to prevent nested view issues. Clicking a node opens the standard Form Dialog.

## 🎨 Style & Customization

The module uses SCSS with distinct support for **Dark Mode**.

- **Light Mode**: Clean, white-card aesthetic with teal accents (`#0097a7`).
- **Dark Mode**: Deep gray backgrounds (`#2e2e2e`), card overlays, and neon-cyan accents (`#00bcd4`).

![Dark Mode](static/description/assets/screenshot_02.png)

## 📸 Gallery

<div style="display: flex; flex-wrap: wrap; gap: 10px;">
    <img src="static/description/assets/screenshot_03.png" width="45%" />
    <img src="static/description/assets/screenshot_04.png" width="45%" />
    <img src="static/description/assets/screenshot_05.png" width="45%" />
    <img src="static/description/assets/screenshot_06.png" width="45%" />
</div>

## 🛠 Configuration Attributes

| Attribute           | Description                                    | Default     |
| :------------------ | :--------------------------------------------- | :---------- |
| `parent_field`      | **Required**. Field name for parent relation.  | `parent_id` |
| `child_field`       | **Required**. Field name for child relation.   | `child_ids` |
| `default_depth`     | Initial expansion level.                       | `2`         |
| `side_panel_fields` | Comma-separated list of fields for Side Panel. | `[]`        |
| `settings_view_id`  | XML ID of the form view for Side Panel.        | `null`      |

## 🤝 Contribution

Developed by **HosamAE**.
Feel free to submit Pull Requests or Issues on GitHub.

## License

This project is licensed under the LGPL-3.0-or-later License - see the [LICENSE](LICENSE) file for details.
Copyright (c) 2026 HosamAE.
