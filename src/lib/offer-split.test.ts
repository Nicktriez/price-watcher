import { describe, expect, it } from "vite-plus/test";
import { splitOfferHeading } from "./offer-split.ts";

describe("splitOfferHeading", () => {
  it("splits a comma + eller list into alternatives", () => {
    expect(splitOfferHeading("Coca-Cola, Fanta eller Tuborg Squash 24-pak")).toEqual([
      "Coca-Cola",
      "Fanta",
      "Tuborg Squash 24-pak",
    ]);
  });

  it("splits a two-item eller list (suffix stays on the last)", () => {
    expect(splitOfferHeading("Carlsberg eller Tuborg 30 stk. kasse")).toEqual([
      "Carlsberg",
      "Tuborg 30 stk. kasse",
    ]);
  });

  it("handles uppercase ELLER and many alternatives", () => {
    const out = splitOfferHeading("KAREN VOLF SMÅKAGER, BITES, KIKS, VAFLER, FLAGER ELLER COOKIES");
    expect(out).toEqual(["KAREN VOLF SMÅKAGER", "BITES", "KIKS", "VAFLER", "FLAGER", "COOKIES"]);
  });

  it("strips hyphen continuation on a split", () => {
    expect(splitOfferHeading("Softkerne- eller græskarkernerugbrød")).toEqual([
      "Softkerne",
      "græskarkernerugbrød",
    ]);
  });

  it("leaves a single product untouched (no eller)", () => {
    expect(splitOfferHeading("Økologisk smør")).toEqual(["Økologisk smør"]);
  });

  it("leaves a single product untouched even with a comma but no eller", () => {
    expect(splitOfferHeading("Ristede, saltede mandler")).toEqual(["Ristede, saltede mandler"]);
  });
});
