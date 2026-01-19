export type CuratedPlace = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  kind: string;
  note?: string;
};

export type CuratedCategoryMap = Record<string, CuratedPlace[]>;

export type CuratedAnchors = Record<string, CuratedCategoryMap>;

export const curatedAnchors: CuratedAnchors = {
  chandrapur: {
    hospital: [
      {
        id: "chandrapur-district-hospital",
        name: "District General Hospital Chandrapur",
        lat: 19.96348,
        lng: 79.29238,
        kind: "hospital",
        note: "Major government hospital & teaching hospital"
      },
      {
        id: "rajurkar-hospital",
        name: "Rajurkar Hospital",
        lat: 19.95719,
        lng: 79.29577,
        kind: "hospital",
        note: "Well-known local private hospital"
      },
      {
        id: "anande-hospital",
        name: "Anande Hospital",
        lat: 19.963,
        lng: 79.289,
        kind: "hospital",
        note: "Private hospital in Ramnagar area"
      }
    ],
    school: [
      {
        id: "chandrapur-cbse-school",
        name: "St. Thomas High School, Chandrapur",
        lat: 19.969,
        lng: 79.302,
        kind: "school",
        note: "Long-standing CBSE school in Chandrapur"
      },
      {
        id: "chandrapur-municipal-school",
        name: "Chandrapur Municipal School",
        lat: 19.97,
        lng: 79.3,
        kind: "school",
        note: "City center school"
      },
      {
        id: "anchaleshwar-mandir-school",
        name: "Anchaleshwar Mandir Public School",
        lat: 19.957,
        lng: 79.297,
        kind: "school",
        note: "Popular local school near temple area"
      }
    ],
    college: [
      {
        id: "government-medical-college-chandrapur",
        name: "Government Medical College, Chandrapur",
        lat: 19.96348,
        lng: 79.29238,
        kind: "college",
        note: "MBBS medical college & attached hospital"
      },
      {
        id: "chandrapur-arts-science-college",
        name: "Shree Shivaji College, Chandrapur",
        lat: 19.961,
        lng: 79.301,
        kind: "college",
        note: "Arts and Science College"
      }
    ],
    railway: [
      {
        id: "chandrapur-railway-station",
        name: "Chandrapur Railway Station",
        lat: 19.954,
        lng: 79.314,
        kind: "railway",
        note: "Main railway station (CD)"
      }
    ],
    bus: [
      {
        id: "chandrapur-bus-stand",
        name: "Chandrapur Bus Stand",
        lat: 19.952,
        lng: 79.305,
        kind: "bus",
        note: "Major city bus stop near city center"
      }
    ],
    market: [
      {
        id: "chandrapur-shopping-area",
        name: "Chandrapur Market",
        lat: 19.969,
        lng: 79.303,
        kind: "market",
        note: "Central market / commercial area"
      }
    ],
    police: [
      {
        id: "chandrapur-police-station",
        name: "Chandrapur Police Station",
        lat: 19.955,
        lng: 79.292,
        kind: "police",
        note: "City police station"
      }
    ]
  }
};
