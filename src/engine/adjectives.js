// Adjectives for comparative / superlative drills, each with a natural sentence (gap = ___).

const A = (base, er, est, rule, comp, sup) => ({ base, er, est, rule, comp, sup });

export const ADJECTIVES = [
  A("tall", "taller", "tallest", "adjectif court : -er", "My little brother is ___ than my dad now.", "Liam is the ___ player on the team."),
  A("small", "smaller", "smallest", "adjectif court : -er", "This apartment is ___ than our old one.", "This is the ___ room in the house."),
  A("big", "bigger", "biggest", "consonne doublée : big → bigger", "A moose is ___ than a deer.", "This is the ___ pizza on the menu."),
  A("hot", "hotter", "hottest", "consonne doublée : hot → hotter", "July is usually ___ than May in Ottawa.", "August was the ___ month of the year."),
  A("happy", "happier", "happiest", "-y → -ier", "Our dog seems ___ since we moved to the country.", "That was the ___ day of my life."),
  A("easy", "easier", "easiest", "-y → -ier", "This test was ___ than the last one.", "This is the ___ exercise in the book."),
  A("heavy", "heavier", "heaviest", "-y → -ier", "My backpack is ___ than yours.", "The piano is the ___ thing in our house."),
  A("funny", "funnier", "funniest", "-y → -ier", "Chikh Fayçal thinks his jokes are ___ than mine.", "Chikh Fayçal is the ___ teacher in the whole school."),
  A("good", "better", "best", "irrégulier : good → better → best", "Your pancakes are ___ than the ones at the restaurant.", "Grandma makes the ___ apple pie in town."),
  A("bad", "worse", "worst", "irrégulier : bad → worse → worst", "The traffic is ___ today than yesterday.", "That was the ___ movie of the year."),
  A("far", "farther/further", "farthest/furthest", "irrégulier : far → farther (ou further)", "The library is ___ from here than the park.", null),
  A("expensive", "more expensive", "most expensive", "adjectif long : more + adjectif", "Gas is ___ this year than last year.", "This is the ___ car in the parking lot."),
  A("interesting", "more interesting", "most interesting", "adjectif long : more + adjectif", "The second movie was ___ than the first one.", "History is the ___ subject this year."),
  A("beautiful", "more beautiful", "most beautiful", "adjectif long : more + adjectif", "The lake was ___ than I imagined.", "Spring is the ___ season, says Mom."),
  A("dangerous", "more dangerous", "most dangerous", "adjectif long : more + adjectif", "Crossing here is ___ than crossing at the lights.", "That is the ___ road in the region."),
  A("comfortable", "more comfortable", "most comfortable", "adjectif long : more + adjectif", "This new sofa is ___ than the old one.", "This is the ___ chair in the house."),
  A("popular", "more popular", "most popular", "adjectif long : more + adjectif", "Hockey is ___ than baseball at our school.", "Hockey is the ___ sport at my school."),
  A("difficult", "more difficult", "most difficult", "adjectif long : more + adjectif", "French grammar is ___ than English grammar, says Chikh Fayçal.", "The last question was the ___ one."),
  A("cold", "colder", "coldest", "adjectif court : -er", "January is ___ than November in Canada.", "January is usually the ___ month in Ottawa."),
  A("fast", "faster", "fastest", "adjectif court : -er", "The train is ___ than the bus.", "The cheetah is the ___ land animal in the world."),
  A("young", "younger", "youngest", "adjectif court : -er", "My cousin is two years ___ than me.", "Zoé is the ___ person in the family."),
  A("old", "older", "oldest", "adjectif court : -er", "Our house is ___ than our neighbours' house.", "This is the ___ building in the city."),
  A("cheap", "cheaper", "cheapest", "adjectif court : -er", "The blue shirt is ___ than the red one.", "This is the ___ phone in the store."),
  A("busy", "busier", "busiest", "-y → -ier", "Saturdays are ___ than Mondays at the mall.", "Friday is the ___ day of the week at the restaurant."),
  A("noisy", "noisier", "noisiest", "-y → -ier", "Our new neighbours are ___ than the old ones.", "Our street is the ___ street in the neighbourhood."),
  A("thin", "thinner", "thinnest", "consonne doublée : thin → thinner", "This book is ___ than the dictionary.", "This is the ___ laptop in the store."),
  A("wet", "wetter", "wettest", "consonne doublée : wet → wetter", "April was ___ than March this year.", "April was the ___ month of the year."),
  A("large", "larger", "largest", "-e → -r", "Their garden is ___ than ours.", "Montreal is the ___ city in Quebec."),
  A("nice", "nicer", "nicest", "-e → -r", "The weather is ___ today than yesterday.", "She is the ___ neighbour on our street."),
];

/** Accepted comparative answers (variants separated by "/"). */
export const COMPARATIVE = (a) => a.er.split("/");
export const SUPERLATIVE = (a) => a.est.split("/");
