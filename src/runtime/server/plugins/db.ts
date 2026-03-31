import { registerCollections, setDrizzleConnection } from "./database";
import _db from "#my-module/db.mjs"
import {collections as _collections} from "#my-module/collections.mjs"

export default defineNitroPlugin(() => {
    setDrizzleConnection(_db)
    registerCollections(_collections)
});
