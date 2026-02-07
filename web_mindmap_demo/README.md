# Tree/MindMap Demo Data 🌳

**Author:** HosamAE  
**Version:** 1.0  
**Depends:** `web_mindmap_view`

## Overview

This module provides rich demo data for the **Mind Map View** module. It serves as a comprehensive example of how to implement the mind map visualization in your own Odoo modules.

## What's Included?

- **Demo Model**: `mindmap.demo` with parent-child relationships, progress tracking, and coloring.
- **Security**: Access rights for the demo model.
- **Views**:
  - A beautifully configured `<mindmap>` view.
  - Standard List and Form views.
  - Inherited settings view.
- **Rich Dataset**: A "Strategic Usage Map" showcasing a multi-level corporate vision, from high-level goals to technical tasks.

## How to Test

1.  Install `web_mindmap_demo`.
2.  Navigate to **Strategy Board** in the main menu.
3.  Explore the hierarchy of nodes.
4.  Try expanding/collapsing branches.
5.  Click on a node to see the side-panel editing in action.

## Implementation Reference

Look at `web_mindmap_demo/views/demo_mindmap.xml` to see how:

- The `<mindmap>` view is defined.
- QWeb templates are used for custom card design.
- Icons and colors are dynamically applied from record data.

## License

This project is licensed under the LGPL-3.0-or-later License - see the [LICENSE](LICENSE) file for details.
Copyright (c) 2026 HosamAE.
