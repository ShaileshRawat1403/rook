import { describe, it, expect } from "vitest";
import {
  SWARM_RECIPES,
  REPO_REVIEW_RECIPE,
  PRD_BUILDER_RECIPE,
  SEO_STRATEGY_RECIPE,
  RELEASE_READINESS_RECIPE,
  DOCS_AUDIT_RECIPE,
} from "./recipes";

describe("Swarm Recipe Validation", () => {
  describe("Every recipe has required fields", () => {
    it("has id", () => {
      SWARM_RECIPES.forEach((recipe) => {
        expect(recipe.id).toBeDefined();
        expect(recipe.id).toBeTruthy();
      });
    });

    it("has name", () => {
      SWARM_RECIPES.forEach((recipe) => {
        expect(recipe.name).toBeDefined();
        expect(recipe.name).toBeTruthy();
      });
    });

    it("has version", () => {
      SWARM_RECIPES.forEach((recipe) => {
        expect(recipe.version).toBeDefined();
        expect(recipe.version).toMatch(/^\d+\.\d+\.\d+$/);
      });
    });

    it("has purpose", () => {
      SWARM_RECIPES.forEach((recipe) => {
        expect(recipe.purpose).toBeDefined();
        expect(recipe.purpose).toBeTruthy();
      });
    });

    it("has trigger examples", () => {
      SWARM_RECIPES.forEach((recipe) => {
        expect(recipe.triggerExamples).toBeDefined();
        expect(recipe.triggerExamples.length).toBeGreaterThan(0);
      });
    });

    it("has risk level", () => {
      SWARM_RECIPES.forEach((recipe) => {
        expect(["low", "medium", "high"]).toContain(recipe.riskLevel);
      });
    });

    it("has colony mapping", () => {
      SWARM_RECIPES.forEach((recipe) => {
        expect(recipe.colonyMapping).toBeDefined();
        expect(recipe.colonyMapping.taskType).toBeTruthy();
        expect(recipe.colonyMapping.seats).toBeDefined();
        expect(recipe.colonyMapping.seats.length).toBeGreaterThan(0);
      });
    });

    it("has final artifact", () => {
      SWARM_RECIPES.forEach((recipe) => {
        expect(recipe.finalArtifact).toBeDefined();
        expect(recipe.finalArtifact.artifactType).toBeDefined();
        expect(recipe.finalArtifact.format).toBeDefined();
      });
    });

    it("has non-goals", () => {
      SWARM_RECIPES.forEach((recipe) => {
        expect(recipe.nonGoals).toBeDefined();
        expect(recipe.nonGoals.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Every specialist has prompt", () => {
    it("Repo Review specialists have prompts", () => {
      REPO_REVIEW_RECIPE.specialists.forEach((specialist) => {
        expect(specialist.taskPrompt).toBeDefined();
        expect(specialist.taskPrompt.length).toBeGreaterThan(100);
      });
    });

    it("PRD Builder specialists have prompts", () => {
      PRD_BUILDER_RECIPE.specialists.forEach((specialist) => {
        expect(specialist.taskPrompt).toBeDefined();
        expect(specialist.taskPrompt.length).toBeGreaterThan(100);
      });
    });

    it("SEO Strategy specialists have prompts", () => {
      SEO_STRATEGY_RECIPE.specialists.forEach((specialist) => {
        expect(specialist.taskPrompt).toBeDefined();
        expect(specialist.taskPrompt.length).toBeGreaterThan(100);
      });
    });

    it("Release Readiness specialists have prompts", () => {
      RELEASE_READINESS_RECIPE.specialists.forEach((specialist) => {
        expect(specialist.taskPrompt).toBeDefined();
        expect(specialist.taskPrompt.length).toBeGreaterThan(100);
      });
    });

    it("Docs Audit specialists have prompts", () => {
      DOCS_AUDIT_RECIPE.specialists.forEach((specialist) => {
        expect(specialist.taskPrompt).toBeDefined();
        expect(specialist.taskPrompt.length).toBeGreaterThan(100);
      });
    });
  });

  describe("Every prompt requires evidence", () => {
    it("prompts mention Evidence section", () => {
      SWARM_RECIPES.forEach((recipe) => {
        recipe.specialists.forEach((specialist) => {
          const prompt = specialist.taskPrompt.toLowerCase();
          expect(prompt).toContain("evidence");
        });
      });
    });
  });

  describe("Every prompt requires uncertainty", () => {
    it("prompts mention Uncertainty section", () => {
      SWARM_RECIPES.forEach((recipe) => {
        recipe.specialists.forEach((specialist) => {
          const prompt = specialist.taskPrompt.toLowerCase();
          expect(prompt).toContain("uncertain");
        });
      });
    });
  });

  describe("Every specialist has output contract", () => {
    it("has format", () => {
      SWARM_RECIPES.forEach((recipe) => {
        recipe.specialists.forEach((specialist) => {
          expect(specialist.outputContract).toBeDefined();
          expect(["markdown", "json", "checklist"]).toContain(
            specialist.outputContract.format,
          );
        });
      });
    });

    it("requires evidence in output contract", () => {
      SWARM_RECIPES.forEach((recipe) => {
        recipe.specialists.forEach((specialist) => {
          expect(specialist.outputContract.evidenceRequired).toBe(true);
        });
      });
    });

    it("requires uncertainty in output contract", () => {
      SWARM_RECIPES.forEach((recipe) => {
        recipe.specialists.forEach((specialist) => {
          expect(specialist.outputContract.uncertaintyRequired).toBe(true);
        });
      });
    });
  });

  describe("Recipe count", () => {
    it("has exactly 5 recipes", () => {
      expect(SWARM_RECIPES.length).toBe(5);
    });
  });
});