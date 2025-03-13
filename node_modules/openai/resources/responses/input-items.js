"use strict";
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseItemListDataPage = exports.InputItems = void 0;
const resource_1 = require("../../resource.js");
const core_1 = require("../../core.js");
const pagination_1 = require("../../pagination.js");
class InputItems extends resource_1.APIResource {
    list(responseId, query = {}, options) {
        if ((0, core_1.isRequestOptions)(query)) {
            return this.list(responseId, {}, query);
        }
        return this._client.getAPIList(`/responses/${responseId}/input_items`, ResponseItemListDataPage, {
            query,
            ...options,
        });
    }
}
exports.InputItems = InputItems;
class ResponseItemListDataPage extends pagination_1.CursorPage {
}
exports.ResponseItemListDataPage = ResponseItemListDataPage;
InputItems.ResponseItemListDataPage = ResponseItemListDataPage;
//# sourceMappingURL=input-items.js.map