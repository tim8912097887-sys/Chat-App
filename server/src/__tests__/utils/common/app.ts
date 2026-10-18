import request from "supertest";
import { createApp } from "../../../app.js";
import { buildContainer } from "../../../container.js";

const container = buildContainer();
const app = createApp(container);

export const api = (): ReturnType<typeof request> => request(app);
