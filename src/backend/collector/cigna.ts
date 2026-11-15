// Cigna's results URL for "Licensed Therapists" on Open Access Plus near one ZIP.
// San Diego was recorded by clicking through the site (docs/smoke-test.md); the other
// cities change only the place fields.
// shortcut: lat/long are ZIP centroids, not the site's own geocode; re-record by clicking through if a city returns the wrong area.
export const PLACES: Record<
  string,
  { city: string; lat: string; lng: string; county: string }
> = {
  "92101": {
    city: "San Diego",
    lat: "32.72162107",
    lng: "-117.1611869",
    county: "San diego",
  },
  "90012": {
    city: "Los Angeles",
    lat: "34.0614",
    lng: "-118.2385",
    county: "Los angeles",
  },
  "94102": {
    city: "San Francisco",
    lat: "37.7795",
    lng: "-122.4193",
    county: "San francisco",
  },
  "95113": {
    city: "San Jose",
    lat: "37.3337",
    lng: "-121.8907",
    county: "Santa clara",
  },
  "95814": {
    city: "Sacramento",
    lat: "38.5804",
    lng: "-121.4922",
    county: "Sacramento",
  },
  "93721": {
    city: "Fresno",
    lat: "36.7327",
    lng: "-119.7848",
    county: "Fresno",
  },
};

const SEARCH =
  "numberOfCounties=1&providerGroupCode=B&clinicalSpecialtyCode1=DD,TO,TH,AA,AI,AF,AM,AB,AG,AT,AR,BP,BF,BD,BR,CD,CE,DL,DB,DS,DV,ED,EC,CC,FB,FY,FI,FR,GA,GI,AX,DR,GF,GT,HV,LD,MC,ML,MO,MI,NT,OC,PM,PA,PH,MH,PT,MJ,MM,PS,PD,SI,SD,SO,GL,TM,WI&specialtyCode=BN,CN,PJ,SW&categoryId=15801&title=Licensed%20Therapists&providerGroupCodes=B&searchCategoryType=doctor-type&searchCategoryCode=HSC02&searchTerm=Behavioral%20Health%20Counselor&consumerCode=HDC001&behavioralProductCode=MHSR&behavioralNetworkCode=6&behavioralEcnCode=MHSR6&medicalProductCode=OAP&medicalEcnCode=OA001";

export function cignaResultsUrl(zip: string): string {
  const { city, lat, lng, county } = PLACES[zip];
  const sp = (s: string) => s.replaceAll(" ", "%20");
  const where = sp(`${city}, CA ${zip}`);
  return `https://hcpdirectory.cigna.com/web/public/consumer/directory/cbh-providers?city=${sp(city)}&zipCode=${zip}&stateCode=CA&country=US&formattedAddress=${where}&latitude=${lat}&longitude=${lng}&searchLocation=${where}&county=${sp(county)}&${SEARCH}`;
}
