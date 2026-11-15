import { describe, expect, it } from "vitest";
import { PLACES, cignaResultsUrl } from "./cigna";

// Recorded by clicking through the site (docs/smoke-test.md).
const SAN_DIEGO =
  "https://hcpdirectory.cigna.com/web/public/consumer/directory/cbh-providers?city=San%20Diego&zipCode=92101&stateCode=CA&country=US&formattedAddress=San%20Diego,%20CA%2092101&latitude=32.72162107&longitude=-117.1611869&searchLocation=San%20Diego,%20CA%2092101&county=San%20diego&numberOfCounties=1&providerGroupCode=B&clinicalSpecialtyCode1=DD,TO,TH,AA,AI,AF,AM,AB,AG,AT,AR,BP,BF,BD,BR,CD,CE,DL,DB,DS,DV,ED,EC,CC,FB,FY,FI,FR,GA,GI,AX,DR,GF,GT,HV,LD,MC,ML,MO,MI,NT,OC,PM,PA,PH,MH,PT,MJ,MM,PS,PD,SI,SD,SO,GL,TM,WI&specialtyCode=BN,CN,PJ,SW&categoryId=15801&title=Licensed%20Therapists&providerGroupCodes=B&searchCategoryType=doctor-type&searchCategoryCode=HSC02&searchTerm=Behavioral%20Health%20Counselor&consumerCode=HDC001&behavioralProductCode=MHSR&behavioralNetworkCode=6&behavioralEcnCode=MHSR6&medicalProductCode=OAP&medicalEcnCode=OA001";

describe("cignaResultsUrl", () => {
  it("rebuilds the recorded San Diego URL", () => {
    expect(cignaResultsUrl("92101")).toBe(SAN_DIEGO);
  });

  it("puts the other city's place in the URL", () => {
    const url = cignaResultsUrl("93721");
    expect(url).toContain("city=Fresno&zipCode=93721");
    expect(url).toContain("county=Fresno&");
  });

  it("covers the six cities from issue 7", () => {
    expect(Object.values(PLACES).map((p) => p.city)).toEqual(
      expect.arrayContaining([
        "San Diego",
        "Los Angeles",
        "San Francisco",
        "San Jose",
        "Sacramento",
        "Fresno",
      ]),
    );
    expect(Object.keys(PLACES)).toHaveLength(6);
  });
});
