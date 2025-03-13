// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
import { APIResource } from "../../resource.mjs";
import { isRequestOptions } from "../../core.mjs";
import { CursorPage } from "../../pagination.mjs";
export class InputItems extends APIResource {
    list(responseId, query = {}, options) {
        if (isRequestOptions(query)) {
            return this.list(responseId, {}, query);
        }
        return this._client.getAPIList(`/responses/${responseId}/input_items`, ResponseItemListDataPage, {
            query,
            ...options,
        });
    }
}
export class ResponseItemListDataPage extends CursorPage {
}
InputItems.ResponseItemListDataPage = ResponseItemListDataPage;
//# sourceMappingURL=input-items.mjs.map