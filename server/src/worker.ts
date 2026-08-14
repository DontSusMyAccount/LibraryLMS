import { createAppFromEnv } from "./app";
import { parseEnv } from "./libs/env";

const env = parseEnv(process.env);
const { app } = createAppFromEnv(process.env);

app.listen(env.PORT);
console.log(`Library LMS API listening on :${env.PORT}`);
