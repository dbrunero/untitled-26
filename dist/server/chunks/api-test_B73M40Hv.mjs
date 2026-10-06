import { r as __exportAll } from "./rolldown-runtime_BMI-E3GI.mjs";
//#region src/pages/api-test.ts
var api_test_exports = /* @__PURE__ */ __exportAll({
	POST: () => POST,
	prerender: () => false
});
var POST = async () => new Response("ok");
//#endregion
//#region \0virtual:astro:page:src/pages/api-test@_@ts
var page = () => api_test_exports;
//#endregion
export { page };
