// The ten most successful directors, by three measures of success weighed
// alike: the critics' (their place on They Shoot Pictures, Don't They?'s
// Top 250 Directors, 2026), the Academy's (their Best Director wins, counted
// twice, and nominations) and the audience's (what their films have taken
// worldwide, brought to 2026 dollars, from TMDB). Each measure ranks some
// fifty candidates, the top of each list among them; a director's places on
// the three are added (a Borda count) and the ten highest kept. A director's
// films are the five most seen and best liked: TMDB's vote count, on a log
// scale, times its average. The figures are a snapshot kept by hand, like
// the canon; the people and films are TMDB's by their ids.
//
// Next were Clint Eastwood, James Cameron and Ridley Scott.

export type DirectorFilmEntry = readonly [
  imdbId: string,
  title: string,
  year: number,
];

export interface DirectorEntry {
  born: number;
  died: number | null;
  films: readonly DirectorFilmEntry[];
  name: string;
  // TMDB's id for the person.
  person: number;
}

export const DIRECTORS: readonly DirectorEntry[] = [
  {
    born: 1946,
    died: null,
    films: [
      ["tt0108052", "Schindler's List", 1993],
      ["tt0120815", "Saving Private Ryan", 1998],
      ["tt0107290", "Jurassic Park", 1993],
      ["tt0264464", "Catch Me If You Can", 2002],
      ["tt0082971", "Raiders of the Lost Ark", 1981],
    ],
    name: "Steven Spielberg",
    person: 488,
  },
  {
    born: 1942,
    died: null,
    films: [
      ["tt1130884", "Shutter Island", 2010],
      ["tt0993846", "The Wolf of Wall Street", 2013],
      ["tt0099685", "Goodfellas", 1990],
      ["tt0407887", "The Departed", 2006],
      ["tt0075314", "Taxi Driver", 1976],
    ],
    name: "Martin Scorsese",
    person: 1032,
  },
  {
    born: 1939,
    died: null,
    films: [
      ["tt0068646", "The Godfather", 1972],
      ["tt0071562", "The Godfather Part II", 1974],
      ["tt0078788", "Apocalypse Now", 1979],
      ["tt0099674", "The Godfather Part III", 1990],
      ["tt0103874", "Bram Stoker's Dracula", 1992],
    ],
    name: "Francis Ford Coppola",
    person: 1776,
  },
  {
    born: 1899,
    died: 1980,
    films: [
      ["tt0054215", "Psycho", 1960],
      ["tt0047396", "Rear Window", 1954],
      ["tt0052357", "Vertigo", 1958],
      ["tt0053125", "North by Northwest", 1959],
      ["tt0046912", "Dial M for Murder", 1954],
    ],
    name: "Alfred Hitchcock",
    person: 2636,
  },
  {
    born: 1906,
    died: 2002,
    films: [
      ["tt0053291", "Some Like It Hot", 1959],
      ["tt0043014", "Sunset Boulevard", 1950],
      ["tt0053604", "The Apartment", 1960],
      ["tt0036775", "Double Indemnity", 1944],
      ["tt0051201", "Witness for the Prosecution", 1957],
    ],
    name: "Billy Wilder",
    person: 3146,
  },
  {
    born: 1908,
    died: 1991,
    films: [
      ["tt0056172", "Lawrence of Arabia", 1962],
      ["tt0050212", "The Bridge on the River Kwai", 1957],
      ["tt0059113", "Doctor Zhivago", 1965],
      ["tt0037558", "Brief Encounter", 1945],
      ["tt0038574", "Great Expectations", 1946],
    ],
    name: "David Lean",
    person: 12238,
  },
  {
    born: 1894,
    died: 1973,
    films: [
      ["tt0049730", "The Searchers", 1956],
      ["tt0056217", "The Man Who Shot Liberty Valance", 1962],
      ["tt0032551", "The Grapes of Wrath", 1940],
      ["tt0031971", "Stagecoach", 1939],
      ["tt0045061", "The Quiet Man", 1952],
    ],
    name: "John Ford",
    person: 8500,
  },
  {
    born: 1935,
    died: null,
    films: [
      ["tt1605783", "Midnight in Paris", 2011],
      ["tt0075686", "Annie Hall", 1977],
      ["tt0416320", "Match Point", 2005],
      ["tt0079522", "Manhattan", 1979],
      ["tt2334873", "Blue Jasmine", 2013],
    ],
    name: "Woody Allen",
    person: 1243,
  },
  {
    born: 1902,
    died: 1981,
    films: [
      ["tt0052618", "Ben-Hur", 1959],
      ["tt0046250", "Roman Holiday", 1953],
      ["tt0036868", "The Best Years of Our Lives", 1946],
      ["tt0060522", "How to Steal a Million", 1966],
      ["tt0054743", "The Children's Hour", 1961],
    ],
    name: "William Wyler",
    person: 10001,
  },
  {
    born: 1928,
    died: 1999,
    films: [
      ["tt0081505", "The Shining", 1980],
      ["tt0066921", "A Clockwork Orange", 1971],
      ["tt0062622", "2001: A Space Odyssey", 1968],
      ["tt0093058", "Full Metal Jacket", 1987],
      ["tt0057012", "Dr. Strangelove", 1964],
    ],
    name: "Stanley Kubrick",
    person: 240,
  },
];
