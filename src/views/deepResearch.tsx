import { List, Cache as RaycastCache } from "@raycast/api";
import assert from "assert";

import * as Functions from "../utils/functions";
import { APIHandler } from '../utils/api_handler';

import { type Data } from "../utils/models";

export default function DeepResearch({ data: Data }: { data: Data }) {
  async function UpdateResearch() {
  }

  // load function every 30s?

  return (
    <List>
      <List.Item title="Leffe Blonde" />
      <List.Item title="Sierra Nevada IPA" />
    </List>
  );
}
