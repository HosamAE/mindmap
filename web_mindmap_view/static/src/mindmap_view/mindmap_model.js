/** @odoo-module */
/*
 * Copyright (c) 2026 HosamAE
 * Licensed under the GNU Lesser General Public License v3.0 or later (LGPL-3.0-or-later)
 * See the LICENSE file in the project root for more information.
 */

import { RelationalModel } from '@web/model/relational_model/relational_model';
import { reactive } from '@odoo/owl';

export class MindMapModel extends RelationalModel {
  setup(params, services) {
    super.setup(...arguments);
    this.rootIds = [];
    this.rootNodes = reactive([]);
    this.nodeMap = reactive({});
    this.expansionStates = new Map();
    this.isInitialLoad = true;

    const archInfo = params.archInfo || {};
    this.parentField = archInfo.parentField || 'parent_id';
    this.childField = archInfo.childField || 'child_ids';
    this.extraRecords = []; // Store recursively fetched descendants
    this._parseDepth(archInfo.defaultDepth);
  }

  _parseDepth(depth) {
    if (depth === 'root') {
      this.defaultDepth = 1;
    } else if (['leaf', 'leave', 'all'].includes(depth)) {
      this.defaultDepth = 999;
    } else {
      this.defaultDepth = parseInt(depth || 2);
    }
  }

  updateConfig(archInfo) {
    this.parentField = archInfo.parentField || this.parentField;
    this.childField = archInfo.childField || this.childField;
    this._parseDepth(archInfo.defaultDepth);
    if (this.root) {
      this.buildTree();
      this.notify();
    }
  }

  async load(params) {
    // Update config from params if present
    if (params?.archInfo) {
      this.parentField = params.archInfo.parentField || this.parentField;
      this.childField = params.archInfo.childField || this.childField;
      this._parseDepth(params.archInfo.defaultDepth);
    }

    const resModel = params?.config?.resModel || this.config?.resModel;
    if (params && params.domain && params.domain.length > 0 && resModel) {
      try {
        const matches = await this.orm.searchRead(resModel, params.domain, ['id', this.parentField]);
        const resultIds = new Set(matches.map((m) => m.id));

        // Use a safe way to extract parent ID from many2one
        const getParentId = (val) => (Array.isArray(val) ? val[0] : typeof val === 'object' && val !== null ? val.id : val);

        let currentLevelIds = matches.map((m) => getParentId(m[this.parentField])).filter((id) => id);

        while (currentLevelIds.length > 0) {
          const parents = await this.orm.searchRead(resModel, [['id', 'in', currentLevelIds]], ['id', this.parentField]);
          for (const p of parents) {
            resultIds.add(p.id);
          }
          currentLevelIds = parents.map((p) => getParentId(p[this.parentField])).filter((id) => id && !resultIds.has(id));
        }

        params.domain = [['id', 'in', Array.from(resultIds)]];
        this.isSearching = true;
        this.originalSearchIds = new Set(matches.map((m) => m.id));
      } catch (e) {
        this.isSearching = false;
      }
    } else if (params && params.domain && params.domain.length === 0) {
      this.isSearching = false;
      this.originalSearchIds = null;
    }

    await super.load(params);
    this.buildTree();
    this.notify();
  }

  /**
   * Recursively fetch all descendants for the given root IDs.
   * This is essential for the Field Widget (One2many) which only sees the first level.
   */
  async fetchDescendants(rootIds) {
    if (!rootIds || rootIds.length === 0) {
      if (this.extraRecords.length > 0) {
        this.extraRecords = [];
        this.buildTree();
      }
      return;
    }

    // Guard against overlapping fetches
    if (this._isFetchingDescendants) return;
    this._isFetchingDescendants = true;

    try {
      this.extraRecords = []; // Reset
      const resModel = this.config.resModel || this.root.resModel;
      // We need to know which fields to fetch to match the root records
      // Ideally we inspect one record from this.root.records
      // But for now, we'll fetch minimally: name, parent, color + active fields if possible
      const fieldsToFetch = ['display_name', this.parentField, 'mindmap_color'];

      let currentLevelIds = [...rootIds];
      const visitedIds = new Set(rootIds);

      // Safety: 10 levels max to prevent infinite loops in bad data
      let depth = 0;
      while (currentLevelIds.length > 0 && depth < 10) {
        const children = await this.orm.searchRead(resModel, [[this.parentField, 'in', currentLevelIds]], fieldsToFetch);
        const newIds = [];

        for (const child of children) {
          if (!visitedIds.has(child.id)) {
            visitedIds.add(child.id);
            newIds.push(child);
            // Convert to a shape similar to this.root.records (simple obj wrapper)
            this.extraRecords.push({
              id: child.id,
              resId: child.id,
              data: child, // Direct data object
            });
          }
        }
        currentLevelIds = newIds.map((c) => c.id);
        depth++;
      }
    } catch (e) {
      console.error('Error fetching descendants', e);
    } finally {
      this._isFetchingDescendants = false;
      this.buildTree();
    }
  }

  buildTree() {
    // Merge main records with extra fetched records
    // Deduplicate in case extraRecords contains something already in root
    const rootRecordIds = new Set(this.root.records.map((r) => r.resId || r.id));
    const mergedRecords = [...this.root.records];

    for (const extra of this.extraRecords) {
      if (!rootRecordIds.has(extra.resId)) {
        mergedRecords.push(extra);
      }
    }

    const records = mergedRecords;
    Object.keys(this.nodeMap).forEach((key) => delete this.nodeMap[key]);
    this.rootNodes.length = 0;

    const colorMapping = {
      1: '#6f42c1',
      2: '#007bff',
      3: '#17a2b8',
      4: '#fd7e14',
      5: '#dc3545',
      6: '#6610f2',
      7: '#d63384',
      8: '#fd7e14',
      9: '#28a745',
      10: '#20c997',
    };

    // 1. Initialize Nodes
    for (const record of records) {
      const originalResId = record.resId || record.id;
      const resIdStr = String(originalResId);
      const stableKey = `node_${resIdStr}`;

      const rawColor = record.data.mindmap_color;
      const colorHex = typeof rawColor === 'string' && rawColor.startsWith('#') ? rawColor : colorMapping[rawColor] || '#dee2e6';

      this.nodeMap[resIdStr] = {
        id: record.id,
        resId: originalResId,
        stableKey: stableKey,
        data: { ...record.data, mindmap_color_hex: colorHex },
        children: [],
        parent: null,
      };

      if (!this.expansionStates.has(resIdStr)) {
        this.expansionStates.set(resIdStr, reactive({ isExpanded: false }));
      }
    }

    // 2. Build Hierarchy
    const isSearchActive = this.root.domain && this.root.domain.length > 0;
    this.highlightedResIds = reactive(new Set());

    for (const record of records) {
      const resIdStr = String(record.resId || record.id);
      const node = this.nodeMap[resIdStr];
      const parentVal = record.data[this.parentField];

      const getParentId = (val) => (Array.isArray(val) ? val[0] : typeof val === 'object' && val !== null ? val.id : val);
      const originalParentId = getParentId(parentVal);
      const parentIdStr = originalParentId ? String(originalParentId) : null;

      if (parentIdStr && this.nodeMap[parentIdStr]) {
        let p = this.nodeMap[parentIdStr];
        let isCycle = false;
        while (p) {
          if (String(p.resId) === resIdStr) {
            isCycle = true;
            break;
          }
          p = p.parent;
        }

        if (!isCycle) {
          node.parent = this.nodeMap[parentIdStr];
          this.nodeMap[parentIdStr].children.push(node);
        } else {
          this.rootNodes.push(node);
        }
      } else {
        // IMPORTANT for Field Widget: if a node has a parent ID, but that parent is NOT in our set,
        // it means it's a "Top Level" node for this specific view (the parent is outside the O2M scope).
        // So we treat it as a root.
        this.rootNodes.push(node);
      }
    }

    // 3. Expansion & Search Highlighting
    if (isSearchActive) {
      for (const [resId, state] of this.expansionStates) {
        state.isExpanded = false;
      }
      for (const record of records) {
        const resId = record.resId || record.id;
        if (this.originalSearchIds && this.originalSearchIds.has(resId)) {
          this.highlightedResIds.add(resId);
        }
        this._expandPathToRoot(resId);
      }
    } else if (this.isInitialLoad) {
      // CLEAR existing expansion states to enforce default on fresh load
      for (const [resId, state] of this.expansionStates) {
        state.isExpanded = false;
      }
      for (const rootNode of this.rootNodes) {
        this._expandRecursive(rootNode, 1);
      }
      this.isInitialLoad = false;
    }
  }

  _expandRecursive(node, currentDepth) {
    if (currentDepth < this.defaultDepth) {
      this.getExpansionState(node.resId).isExpanded = true;
      for (const child of node.children) {
        this._expandRecursive(child, currentDepth + 1);
      }
    }
  }

  _expandPathToRoot(resId) {
    let node = this.nodeMap[String(resId)];
    if (node && node.children.length > 0) {
      this.getExpansionState(node.resId).isExpanded = true;
    }
    let parent = node ? node.parent : null;
    while (parent) {
      this.getExpansionState(parent.resId).isExpanded = true;
      parent = parent.parent;
    }
  }

  clearHighlights() {
    if (this.highlightedResIds && this.highlightedResIds.size > 0) {
      this.highlightedResIds.clear();
    }
  }

  getExpansionState(resId) {
    const resIdStr = String(resId);
    if (!this.expansionStates.has(resIdStr)) {
      this.expansionStates.set(resIdStr, reactive({ isExpanded: false }));
    }
    return this.expansionStates.get(resIdStr);
  }

  toggleNode(resId) {
    const state = this.getExpansionState(resId);
    state.isExpanded = !state.isExpanded;
  }

  expandNodeByResId(resId) {
    const state = this.getExpansionState(resId);
    state.isExpanded = true;
    this.notify(); // Explicitly notify for external triggers just in case
  }

  async deleteRecord(resId) {
    await this.orm.unlink(this.config.resModel, [resId]);
    // Force reactive clearing so observers see the change before the reload
    this.rootNodes.length = 0;
    Object.keys(this.nodeMap).forEach((k) => delete this.nodeMap[k]);
    this.expansionStates.delete(resId);
  }

  async loadNodeExtraData(resId) {
    const node = this.nodeMap[resId];
    if (!node || node.extraDataLoaded) {
      return;
    }

    try {
      const data = await this.orm.call(this.config.resModel, 'get_mindmap_card_data', [resId]);
      node.extraData = data;
      node.extraDataLoaded = true;
    } catch (e) {
      // Fallback or empty
      node.extraData = [];
      node.extraDataLoaded = true;
    }
  }
}
