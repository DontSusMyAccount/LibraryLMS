import { createAppFromEnv } from "./app";
import { PERSISTENT_DB_OPTIONS } from "./libs/db";
import { parseEnv } from "./libs/env";

const env = parseEnv(process.env);
const { app } = createAppFromEnv(process.env, PERSISTENT_DB_OPTIONS);

app.listen(env.PORT);
console.log(`Library LMS API listening on :${env.PORT}`);
