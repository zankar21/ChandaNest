import assert from "node:assert/strict";
import { AddressInfo } from "node:net";
import test from "node:test";
import express from "express";
import { DEFAULTS } from "../src/constants/propertyEnums";
import { ProjectCreateSchema } from "../src/modules/projects/projects.schemas";
import {
  CreatePropertySchema,
  SubmitPropertySchema
} from "../src/modules/properties/properties.schemas";

function buildTestApp() {
  const app = express();
  app.use(express.json());

  app.post("/projects", (req, res) => {
    try {
      ProjectCreateSchema.parse(req.body);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(400).json({ ok: false, message: err?.message });
    }
  });

  app.post("/listings/draft", (req, res) => {
    try {
      CreatePropertySchema.parse(req.body);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(400).json({ ok: false, message: err?.message });
    }
  });

  app.post("/listings/submit", (req, res) => {
    try {
      SubmitPropertySchema.parse(req.body);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(400).json({ ok: false, message: err?.message });
    }
  });

  return app;
}

async function sendJson(app: express.Express, path: string, body: any) {
  return new Promise<{ status: number; body: any }>((resolve, reject) => {
    const server = app.listen(0, async () => {
      try {
        const { port } = server.address() as AddressInfo;
        const resp = await fetch(`http://127.0.0.1:${port}${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        const json = await resp.json().catch(() => ({}));
        server.close();
        resolve({ status: resp.status, body: json });
      } catch (err) {
        server.close();
        reject(err);
      }
    });
  });
}

const app = buildTestApp();

test("plotted project missing gat/survey number should fail", async () => {
  const payload = {
    name: "Test Project",
    developerName: "DevCo",
    projectType: "plotted",
    status: "launching",
    brokeragePartnerId: DEFAULTS.brokeragePartnerId,
    location: {
      citySlug: "city",
      locality: "locality",
      mouza: "mouza"
    },
    legal: {
      totalLandAreaSqFt: 1000,
      naStatus: "applied",
      layoutApprovalStatus: "in_process"
    }
  };

  const res = await sendJson(app, "/projects", payload);
  assert.equal(res.status, 400);
});

test("naStatus approved without order details should fail", async () => {
  const payload = {
    name: "Project With NA",
    developerName: "DevCo",
    projectType: "plotted",
    status: "launching",
    brokeragePartnerId: DEFAULTS.brokeragePartnerId,
    location: {
      citySlug: "city",
      locality: "locality",
      mouza: "mouza"
    },
    legal: {
      surveyOrGatNo: "123",
      totalLandAreaSqFt: 1200,
      naStatus: "approved",
      layoutApprovalStatus: "in_process"
    }
  };
  const res = await sendJson(app, "/projects", payload);
  assert.equal(res.status, 400);
});

test("sale listing allows draft but fails submit without pricing", async () => {
  const payload = {
    mode: "independent",
    type: "sale",
    propertyType: "land",
    title: "Test Land",
    brokeragePartnerId: DEFAULTS.brokeragePartnerId,
    location: {
      citySlug: "city",
      locality: "locality"
    },
    specs: {
      land: {
        plotAreaSqFt: 1000
      }
    },
    pricing: {}
  };

  const draft = await sendJson(app, "/listings/draft", payload);
  assert.equal(draft.status, 200);

  const submit = await sendJson(app, "/listings/submit", payload);
  assert.equal(submit.status, 400);
});

test("project unit without projectId should fail", async () => {
  const payload = {
    mode: "project_unit",
    type: "sale",
    propertyType: "plot",
    title: "Project Plot",
    brokeragePartnerId: DEFAULTS.brokeragePartnerId,
    unitType: "plot",
    unit: {
      plot: {
        plotAreaSqFt: 900
      },
      plotNo: "A-1"
    },
    availability: "available"
  };

  const res = await sendJson(app, "/listings/draft", payload);
  assert.equal(res.status, 400);
});
