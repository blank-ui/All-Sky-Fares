/**
 * Global Airport and Metropolitan Registry for AllSkyFares
 * Comprehensive dataset covering top global international and domestic passenger hubs.
 * Provides fuzzy, prefix, alias, and IATA search with Google Flights-style ranking.
 */

export const AIRPORTS = [
  // ================= NORTH AMERICA (USA & CANADA & MEXICO) =================
  { code: "JFK", name: "John F. Kennedy International", city: "New York", state: "NY", country: "United States", aliases: ["jfk", "kennedy", "new york", "nyc", "queens"] },
  { code: "EWR", name: "Newark Liberty International", city: "New York / Newark", state: "NJ", country: "United States", aliases: ["newark", "liberty", "new york", "nyc", "jersey"] },
  { code: "LGA", name: "LaGuardia Airport", city: "New York", state: "NY", country: "United States", aliases: ["laguardia", "new york", "nyc", "queens"] },
  { code: "LAX", name: "Los Angeles International", city: "Los Angeles", state: "CA", country: "United States", aliases: ["lax", "los angeles", "hollywood", "california", "la"] },
  { code: "SFO", name: "San Francisco International", city: "San Francisco", state: "CA", country: "United States", aliases: ["sfo", "san francisco", "bay area", "silicon valley", "california"] },
  { code: "OAK", name: "Oakland International", city: "Oakland / San Francisco", state: "CA", country: "United States", aliases: ["oakland", "san francisco bay"] },
  { code: "SJC", name: "Norman Y. Mineta San Jose Intl", city: "San Jose", state: "CA", country: "United States", aliases: ["san jose", "silicon valley"] },
  { code: "ORD", name: "O'Hare International Airport", city: "Chicago", state: "IL", country: "United States", aliases: ["ohare", "chicago", "illinois"] },
  { code: "MDW", name: "Chicago Midway International", city: "Chicago", state: "IL", country: "United States", aliases: ["midway", "chicago"] },
  { code: "MIA", name: "Miami International Airport", city: "Miami", state: "FL", country: "United States", aliases: ["miami", "florida", "south beach"] },
  { code: "FLL", name: "Fort Lauderdale-Hollywood Intl", city: "Fort Lauderdale", state: "FL", country: "United States", aliases: ["fort lauderdale", "miami area", "florida"] },
  { code: "MCO", name: "Orlando International Airport", city: "Orlando", state: "FL", country: "United States", aliases: ["orlando", "disney", "florida"] },
  { code: "TPA", name: "Tampa International Airport", city: "Tampa", state: "FL", country: "United States", aliases: ["tampa", "florida", "clearwater"] },
  { code: "DFW", name: "Dallas/Fort Worth International", city: "Dallas / Fort Worth", state: "TX", country: "United States", aliases: ["dallas", "fort worth", "texas", "dfw"] },
  { code: "IAH", name: "George Bush Intercontinental", city: "Houston", state: "TX", country: "United States", aliases: ["houston", "bush", "texas"] },
  { code: "HOU", name: "William P. Hobby Airport", city: "Houston", state: "TX", country: "United States", aliases: ["hobby", "houston", "texas"] },
  { code: "AUS", name: "Austin-Bergstrom International", city: "Austin", state: "TX", country: "United States", aliases: ["austin", "texas"] },
  { code: "ATL", name: "Hartsfield-Jackson Atlanta Intl", city: "Atlanta", state: "GA", country: "United States", aliases: ["atlanta", "hartsfield", "georgia"] },
  { code: "BOS", name: "Logan International Airport", city: "Boston", state: "MA", country: "United States", aliases: ["boston", "logan", "massachusetts"] },
  { code: "SEA", name: "Seattle-Tacoma International", city: "Seattle", state: "WA", country: "United States", aliases: ["seattle", "seatac", "tacoma", "washington"] },
  { code: "DEN", name: "Denver International Airport", city: "Denver", state: "CO", country: "United States", aliases: ["denver", "colorado", "rockies"] },
  { code: "LAS", name: "Harry Reid International Airport", city: "Las Vegas", state: "NV", country: "United States", aliases: ["las vegas", "vegas", "mccarran", "nevada", "casino"] },
  { code: "PHX", name: "Phoenix Sky Harbor International", city: "Phoenix", state: "AZ", country: "United States", aliases: ["phoenix", "sky harbor", "arizona", "scottsdale"] },
  { code: "SAN", name: "San Diego International", city: "San Diego", state: "CA", country: "United States", aliases: ["san diego", "lindbergh", "california"] },
  { code: "IAD", name: "Washington Dulles International", city: "Washington, D.C.", state: "VA", country: "United States", aliases: ["dulles", "washington", "dc", "virginia"] },
  { code: "DCA", name: "Ronald Reagan Washington National", city: "Washington, D.C.", state: "VA", country: "United States", aliases: ["reagan", "washington", "national", "dc"] },
  { code: "BWI", name: "Baltimore/Washington International", city: "Baltimore / Washington", state: "MD", country: "United States", aliases: ["baltimore", "washington", "maryland"] },
  { code: "MSP", name: "Minneapolis-Saint Paul Intl", city: "Minneapolis / St. Paul", state: "MN", country: "United States", aliases: ["minneapolis", "st paul", "minnesota"] },
  { code: "DTW", name: "Detroit Metropolitan Airport", city: "Detroit", state: "MI", country: "United States", aliases: ["detroit", "wayne county", "michigan"] },
  { code: "PHL", name: "Philadelphia International", city: "Philadelphia", state: "PA", country: "United States", aliases: ["philadelphia", "philly", "pennsylvania"] },
  { code: "CLT", name: "Charlotte Douglas International", city: "Charlotte", state: "NC", country: "United States", aliases: ["charlotte", "douglas", "north carolina"] },
  { code: "SLC", name: "Salt Lake City International", city: "Salt Lake City", state: "UT", country: "United States", aliases: ["salt lake city", "utah", "ski"] },
  { code: "PDX", name: "Portland International Airport", city: "Portland", state: "OR", country: "United States", aliases: ["portland", "oregon"] },
  { code: "HNL", name: "Daniel K. Inouye International", city: "Honolulu", state: "HI", country: "United States", aliases: ["honolulu", "hawaii", "oahu", "waikiki"] },
  { code: "OGG", name: "Kahului Airport", city: "Kahului / Maui", state: "HI", country: "United States", aliases: ["maui", "kahului", "hawaii"] },
  { code: "ANC", name: "Ted Stevens Anchorage Intl", city: "Anchorage", state: "AK", country: "United States", aliases: ["anchorage", "alaska"] },

  // Canada
  { code: "YYZ", name: "Toronto Pearson International", city: "Toronto", state: "ON", country: "Canada", aliases: ["toronto", "pearson", "ontario", "canada"] },
  { code: "YVR", name: "Vancouver International Airport", city: "Vancouver", state: "BC", country: "Canada", aliases: ["vancouver", "british columbia", "canada"] },
  { code: "YUL", name: "Montréal-Trudeau International", city: "Montréal", state: "QC", country: "Canada", aliases: ["montreal", "trudeau", "quebec", "canada"] },
  { code: "YYC", name: "Calgary International Airport", city: "Calgary", state: "AB", country: "Canada", aliases: ["calgary", "alberta", "banff", "canada"] },
  { code: "YOW", name: "Ottawa Macdonald-Cartier Intl", city: "Ottawa", state: "ON", country: "Canada", aliases: ["ottawa", "ontario", "capital", "canada"] },
  { code: "YEG", name: "Edmonton International Airport", city: "Edmonton", state: "AB", country: "Canada", aliases: ["edmonton", "alberta", "canada"] },
  { code: "YHZ", name: "Halifax Stanfield International", city: "Halifax", state: "NS", country: "Canada", aliases: ["halifax", "nova scotia", "canada"] },

  // Mexico
  { code: "MEX", name: "Mexico City Benito Juárez Intl", city: "Mexico City", country: "Mexico", aliases: ["mexico city", "benito juarez", "cdmx"] },
  { code: "CUN", name: "Cancún International Airport", city: "Cancún", country: "Mexico", aliases: ["cancun", "riviera maya", "playa del carmen", "mexico"] },
  { code: "GDL", name: "Guadalajara International", city: "Guadalajara", country: "Mexico", aliases: ["guadalajara", "jalisco", "mexico"] },
  { code: "MTY", name: "Monterrey International Airport", city: "Monterrey", country: "Mexico", aliases: ["monterrey", "nuevo leon", "mexico"] },
  { code: "SJD", name: "Los Cabos International Airport", city: "San José del Cabo", country: "Mexico", aliases: ["los cabos", "cabo", "baja california", "mexico"] },
  { code: "PVR", name: "Puerto Vallarta International", city: "Puerto Vallarta", country: "Mexico", aliases: ["puerto vallarta", "vallarta", "jalisco", "mexico"] },

  // ================= EUROPE =================
  // United Kingdom
  { code: "LHR", name: "London Heathrow Airport", city: "London", country: "United Kingdom", aliases: ["heathrow", "london", "uk", "great britain", "england"] },
  { code: "LGW", name: "London Gatwick Airport", city: "London", country: "United Kingdom", aliases: ["gatwick", "london", "uk", "england"] },
  { code: "STN", name: "London Stansted Airport", city: "London", country: "United Kingdom", aliases: ["stansted", "london", "uk"] },
  { code: "LCY", name: "London City Airport", city: "London", country: "United Kingdom", aliases: ["london city", "docklands", "london", "uk"] },
  { code: "LTN", name: "London Luton Airport", city: "London", country: "United Kingdom", aliases: ["luton", "london", "uk"] },
  { code: "MAN", name: "Manchester Airport", city: "Manchester", country: "United Kingdom", aliases: ["manchester", "uk", "england"] },
  { code: "EDI", name: "Edinburgh Airport", city: "Edinburgh", country: "United Kingdom", aliases: ["edinburgh", "scotland", "uk"] },
  { code: "GLA", name: "Glasgow Airport", city: "Glasgow", country: "United Kingdom", aliases: ["glasgow", "scotland", "uk"] },
  { code: "BHX", name: "Birmingham Airport", city: "Birmingham", country: "United Kingdom", aliases: ["birmingham", "uk", "england"] },
  { code: "BFS", name: "Belfast International Airport", city: "Belfast", country: "United Kingdom", aliases: ["belfast", "northern ireland", "uk"] },

  // France
  { code: "CDG", name: "Charles de Gaulle Airport", city: "Paris", country: "France", aliases: ["charles de gaulle", "cdg", "roissy", "paris", "france"] },
  { code: "ORY", name: "Paris Orly Airport", city: "Paris", country: "France", aliases: ["orly", "paris", "france"] },
  { code: "NCE", name: "Nice Côte d'Azur Airport", city: "Nice", country: "France", aliases: ["nice", "cote d'azur", "french riviera", "monaco", "cannes", "france"] },
  { code: "LYS", name: "Lyon-Saint Exupéry Airport", city: "Lyon", country: "France", aliases: ["lyon", "france"] },
  { code: "MRS", name: "Marseille Provence Airport", city: "Marseille", country: "France", aliases: ["marseille", "provence", "france"] },

  // Germany
  { code: "FRA", name: "Frankfurt Airport", city: "Frankfurt", country: "Germany", aliases: ["frankfurt", "germany", "deutschland"] },
  { code: "MUC", name: "Munich Airport", city: "Munich", country: "Germany", aliases: ["munich", "muenchen", "bavaria", "germany"] },
  { code: "BER", name: "Berlin Brandenburg Airport", city: "Berlin", country: "Germany", aliases: ["berlin", "brandenburg", "germany"] },
  { code: "DUS", name: "Düsseldorf Airport", city: "Düsseldorf", country: "Germany", aliases: ["dusseldorf", "duesseldorf", "germany"] },
  { code: "HAM", name: "Hamburg Airport", city: "Hamburg", country: "Germany", aliases: ["hamburg", "germany"] },

  // Netherlands & Belgium & Ireland
  { code: "AMS", name: "Amsterdam Schiphol Airport", city: "Amsterdam", country: "Netherlands", aliases: ["schiphol", "amsterdam", "holland", "netherlands"] },
  { code: "BRU", name: "Brussels Airport", city: "Brussels", country: "Belgium", aliases: ["brussels", "zaventem", "belgium"] },
  { code: "DUB", name: "Dublin Airport", city: "Dublin", country: "Ireland", aliases: ["dublin", "ireland", "eire"] },

  // Switzerland & Austria
  { code: "ZRH", name: "Zurich Airport", city: "Zurich", country: "Switzerland", aliases: ["zurich", "zuerich", "switzerland", "swiss alps"] },
  { code: "GVA", name: "Geneva Airport", city: "Geneva", country: "Switzerland", aliases: ["geneva", "geneve", "switzerland", "swiss alps", "zermatt"] },
  { code: "BSL", name: "EuroAirport Basel Mulhouse Freiburg", city: "Basel", country: "Switzerland", aliases: ["basel", "mulhouse", "switzerland", "france"] },
  { code: "VIE", name: "Vienna International Airport", city: "Vienna", country: "Austria", aliases: ["vienna", "wien", "austria"] },

  // Spain & Portugal
  { code: "MAD", name: "Adolfo Suárez Madrid-Barajas", city: "Madrid", country: "Spain", aliases: ["madrid", "barajas", "spain", "espana"] },
  { code: "BCN", name: "Josep Tarradellas Barcelona-El Prat", city: "Barcelona", country: "Spain", aliases: ["barcelona", "el prat", "catalonia", "spain"] },
  { code: "AGP", name: "Málaga-Costa del Sol Airport", city: "Málaga", country: "Spain", aliases: ["malaga", "costa del sol", "andalucia", "spain"] },
  { code: "PMI", name: "Palma de Mallorca Airport", city: "Palma de Mallorca", country: "Spain", aliases: ["mallorca", "palma", "balearic islands", "spain"] },
  { code: "IBZ", name: "Ibiza Airport", city: "Ibiza", country: "Spain", aliases: ["ibiza", "balearic islands", "spain"] },
  { code: "LIS", name: "Humberto Delgado Airport", city: "Lisbon", country: "Portugal", aliases: ["lisbon", "lisboa", "portugal"] },
  { code: "OPO", name: "Francisco Sá Carneiro Airport", city: "Porto", country: "Portugal", aliases: ["porto", "oporto", "portugal"] },
  { code: "FAO", name: "Faro Airport", city: "Faro", country: "Portugal", aliases: ["faro", "algarve", "portugal"] },

  // Italy
  { code: "FCO", name: "Leonardo da Vinci-Fiumicino", city: "Rome", country: "Italy", aliases: ["fiumicino", "rome", "roma", "italy", "italia"] },
  { code: "CIA", name: "Rome Ciampino Airport", city: "Rome", country: "Italy", aliases: ["ciampino", "rome", "italy"] },
  { code: "MXP", name: "Milan Malpensa Airport", city: "Milan", country: "Italy", aliases: ["malpensa", "milan", "milano", "italy"] },
  { code: "LIN", name: "Milan Linate Airport", city: "Milan", country: "Italy", aliases: ["linate", "milan", "italy"] },
  { code: "VCE", name: "Venice Marco Polo Airport", city: "Venice", country: "Italy", aliases: ["venice", "marco polo", "venezia", "italy"] },
  { code: "NAP", name: "Naples International Airport", city: "Naples", country: "Italy", aliases: ["naples", "napoli", "amalfi coast", "italy"] },
  { code: "FLR", name: "Florence Airport", city: "Florence", country: "Italy", aliases: ["florence", "firenze", "tuscany", "italy"] },

  // Scandinavia
  { code: "CPH", name: "Copenhagen Airport", city: "Copenhagen", country: "Denmark", aliases: ["copenhagen", "kastrup", "denmark"] },
  { code: "ARN", name: "Stockholm Arlanda Airport", city: "Stockholm", country: "Sweden", aliases: ["stockholm", "arlanda", "sweden"] },
  { code: "OSL", name: "Oslo Gardermoen Airport", city: "Oslo", country: "Norway", aliases: ["oslo", "gardermoen", "norway"] },
  { code: "HEL", name: "Helsinki-Vantaa Airport", city: "Helsinki", country: "Finland", aliases: ["helsinki", "vantaa", "finland"] },
  { code: "KEF", name: "Keflavík International Airport", city: "Reykjavík", country: "Iceland", aliases: ["reykjavik", "keflavik", "iceland", "blue lagoon"] },

  // Central & Eastern Europe & Mediterranean
  { code: "IST", name: "Istanbul Airport", city: "Istanbul", country: "Turkey", aliases: ["istanbul", "turkey", "turkiye"] },
  { code: "SAW", name: "Sabiha Gökçen International", city: "Istanbul", country: "Turkey", aliases: ["sabiha", "istanbul", "turkey"] },
  { code: "AYT", name: "Antalya Airport", city: "Antalya", country: "Turkey", aliases: ["antalya", "turkey", "mediterranean"] },
  { code: "ATH", name: "Athens International Airport", city: "Athens", country: "Greece", aliases: ["athens", "eleftherios venizelos", "greece", "hellas"] },
  { code: "JTR", name: "Santorini Airport", city: "Santorini / Thira", country: "Greece", aliases: ["santorini", "thira", "greek islands", "greece"] },
  { code: "JMK", name: "Mykonos Airport", city: "Mykonos", country: "Greece", aliases: ["mykonos", "greek islands", "greece"] },
  { code: "HER", name: "Heraklion International", city: "Crete / Heraklion", country: "Greece", aliases: ["crete", "heraklion", "greece"] },
  { code: "PRG", name: "Václav Havel Airport Prague", city: "Prague", country: "Czech Republic", aliases: ["prague", "praha", "czechia"] },
  { code: "BUD", name: "Budapest Ferenc Liszt Intl", city: "Budapest", country: "Hungary", aliases: ["budapest", "ferenc liszt", "hungary"] },
  { code: "WAW", name: "Warsaw Chopin Airport", city: "Warsaw", country: "Poland", aliases: ["warsaw", "chopin", "poland", "polska"] },
  { code: "KRK", name: "Kraków John Paul II International", city: "Kraków", country: "Poland", aliases: ["krakow", "cracow", "poland"] },
  { code: "OTP", name: "Henri Coandă International", city: "Bucharest", country: "Romania", aliases: ["bucharest", "otopeni", "romania"] },

  // ================= MIDDLE EAST =================
  { code: "DXB", name: "Dubai International Airport", city: "Dubai", country: "United Arab Emirates", aliases: ["dubai", "uae", "emirates"] },
  { code: "DWC", name: "Al Maktoum International Airport", city: "Dubai", country: "United Arab Emirates", aliases: ["dubai south", "al maktoum", "uae"] },
  { code: "AUH", name: "Zayed International Airport", city: "Abu Dhabi", country: "United Arab Emirates", aliases: ["abu dhabi", "zayed", "uae"] },
  { code: "DOH", name: "Hamad International Airport", city: "Doha", country: "Qatar", aliases: ["doha", "hamad", "qatar"] },
  { code: "JED", name: "King Abdulaziz International", city: "Jeddah", country: "Saudi Arabia", aliases: ["jeddah", "mecca", "makkah", "saudi arabia"] },
  { code: "RUH", name: "King Khalid International", city: "Riyadh", country: "Saudi Arabia", aliases: ["riyadh", "saudi arabia"] },
  { code: "DMM", name: "King Fahd International", city: "Dammam", country: "Saudi Arabia", aliases: ["dammam", "khobar", "saudi arabia"] },
  { code: "BAH", name: "Bahrain International Airport", city: "Manama", country: "Bahrain", aliases: ["bahrain", "manama"] },
  { code: "KWI", name: "Kuwait International Airport", city: "Kuwait City", country: "Kuwait", aliases: ["kuwait", "kuwait city"] },
  { code: "MCT", name: "Muscat International Airport", city: "Muscat", country: "Oman", aliases: ["muscat", "oman"] },
  { code: "AMM", name: "Queen Alia International", city: "Amman", country: "Jordan", aliases: ["amman", "queen alia", "jordan", "petra"] },
  { code: "BEY", name: "Beirut-Rafic Hariri International", city: "Beirut", country: "Lebanon", aliases: ["beirut", "lebanon"] },
  { code: "TLV", name: "Ben Gurion Airport", city: "Tel Aviv", country: "Israel", aliases: ["tel aviv", "ben gurion", "jerusalem", "israel"] },

  // ================= ASIA & SUBCONTINENT =================
  // India
  { code: "DEL", name: "Indira Gandhi International", city: "Delhi / New Delhi", country: "India", aliases: ["delhi", "new delhi", "igi", "india"] },
  { code: "BOM", name: "Chhatrapati Shivaji Maharaj Intl", city: "Mumbai", country: "India", aliases: ["mumbai", "bombay", "maharashtra", "india"] },
  { code: "BLR", name: "Kempegowda International Airport", city: "Bengaluru", country: "India", aliases: ["bangalore", "bengaluru", "karnataka", "india"] },
  { code: "MAA", name: "Chennai International Airport", city: "Chennai", country: "India", aliases: ["chennai", "madras", "tamil nadu", "india"] },
  { code: "HYD", name: "Rajiv Gandhi International Airport", city: "Hyderabad", country: "India", aliases: ["hyderabad", "telangana", "india"] },
  { code: "CCU", name: "Netaji Subhash Chandra Bose Intl", city: "Kolkata", country: "India", aliases: ["kolkata", "calcutta", "west bengal", "india"] },
  { code: "COK", name: "Cochin International Airport", city: "Kochi / Cochin", country: "India", aliases: ["kochi", "cochin", "kerala", "india"] },
  { code: "GOI", name: "Dabolim Airport", city: "Goa (Dabolim)", country: "India", aliases: ["goa", "dabolim", "india", "beaches"] },
  { code: "GOX", name: "Manohar International Airport", city: "Goa (Mopa)", country: "India", aliases: ["goa", "mopa", "north goa", "india"] },
  { code: "AMD", name: "Sardar Vallabhbhai Patel Intl", city: "Ahmedabad", country: "India", aliases: ["ahmedabad", "gujarat", "india"] },
  { code: "PNQ", name: "Pune Airport", city: "Pune", country: "India", aliases: ["pune", "maharashtra", "india"] },
  { code: "JAI", name: "Jaipur International Airport", city: "Jaipur", country: "India", aliases: ["jaipur", "rajasthan", "pink city", "india"] },
  { code: "LKO", name: "Chaudhary Charan Singh Intl", city: "Lucknow", country: "India", aliases: ["lucknow", "uttar pradesh", "india"] },
  { code: "TRV", name: "Thiruvananthapuram International", city: "Trivandrum", country: "India", aliases: ["trivandrum", "thiruvananthapuram", "kerala", "india"] },
  { code: "ATQ", name: "Sri Guru Ram Dass Jee Intl", city: "Amritsar", country: "India", aliases: ["amritsar", "golden temple", "punjab", "india"] },

  // Southeast & East Asia
  { code: "SIN", name: "Singapore Changi Airport", city: "Singapore", country: "Singapore", aliases: ["singapore", "changi"] },
  { code: "BKK", name: "Suvarnabhumi Airport", city: "Bangkok", country: "Thailand", aliases: ["bangkok", "suvarnabhumi", "thailand"] },
  { code: "DMK", name: "Don Mueang International", city: "Bangkok", country: "Thailand", aliases: ["don mueang", "bangkok", "thailand"] },
  { code: "HKT", name: "Phuket International Airport", city: "Phuket", country: "Thailand", aliases: ["phuket", "thailand", "beaches"] },
  { code: "CNX", name: "Chiang Mai International", city: "Chiang Mai", country: "Thailand", aliases: ["chiang mai", "thailand"] },
  { code: "KUL", name: "Kuala Lumpur International Airport", city: "Kuala Lumpur", country: "Malaysia", aliases: ["kuala lumpur", "klia", "malaysia"] },
  { code: "DPS", name: "Ngurah Rai International Airport", city: "Denpasar / Bali", country: "Indonesia", aliases: ["bali", "denpasar", "indonesia", "kuta", "ubud"] },
  { code: "CGK", name: "Soekarno-Hatta International", city: "Jakarta", country: "Indonesia", aliases: ["jakarta", "indonesia"] },
  { code: "MNL", name: "Ninoy Aquino International", city: "Manila", country: "Philippines", aliases: ["manila", "ninoy aquino", "philippines"] },
  { code: "CEB", name: "Mactan-Cebu International", city: "Cebu", country: "Philippines", aliases: ["cebu", "mactan", "philippines"] },
  { code: "SGN", name: "Tan Son Nhat International", city: "Ho Chi Minh City", country: "Vietnam", aliases: ["ho chi minh city", "saigon", "vietnam"] },
  { code: "HAN", name: "Noi Bai International Airport", city: "Hanoi", country: "Vietnam", aliases: ["hanoi", "noi bai", "vietnam"] },
  { code: "DAD", name: "Da Nang International Airport", city: "Da Nang", country: "Vietnam", aliases: ["da nang", "vietnam", "hoi an"] },

  // Japan, Korea, China, Taiwan, Hong Kong
  { code: "HND", name: "Tokyo Haneda Airport", city: "Tokyo", country: "Japan", aliases: ["haneda", "tokyo", "japan", "nihon"] },
  { code: "NRT", name: "Tokyo Narita Airport", city: "Tokyo", country: "Japan", aliases: ["narita", "tokyo", "japan"] },
  { code: "KIX", name: "Kansai International Airport", city: "Osaka / Kyoto", country: "Japan", aliases: ["kansai", "osaka", "kyoto", "japan"] },
  { code: "ITM", name: "Osaka Itami Airport", city: "Osaka", country: "Japan", aliases: ["itami", "osaka", "japan"] },
  { code: "CTS", name: "New Chitose Airport", city: "Sapporo / Hokkaido", country: "Japan", aliases: ["sapporo", "chitose", "hokkaido", "japan", "ski"] },
  { code: "FUK", name: "Fukuoka Airport", city: "Fukuoka", country: "Japan", aliases: ["fukuoka", "japan"] },
  { code: "ICN", name: "Incheon International Airport", city: "Seoul", country: "South Korea", aliases: ["incheon", "seoul", "korea", "south korea"] },
  { code: "GMP", name: "Gimpo International Airport", city: "Seoul", country: "South Korea", aliases: ["gimpo", "seoul", "korea"] },
  { code: "PUS", name: "Gimhae International Airport", city: "Busan", country: "South Korea", aliases: ["busan", "pusan", "korea"] },
  { code: "HKG", name: "Hong Kong International Airport", city: "Hong Kong", country: "Hong Kong", aliases: ["hong kong", "chek lap kok", "hk"] },
  { code: "TPE", name: "Taiwan Taoyuan International", city: "Taipei", country: "Taiwan", aliases: ["taipei", "taoyuan", "taiwan"] },
  { code: "TSA", name: "Taipei Songshan Airport", city: "Taipei", country: "Taiwan", aliases: ["songshan", "taipei", "taiwan"] },
  { code: "PEK", name: "Beijing Capital International", city: "Beijing", country: "China", aliases: ["beijing capital", "beijing", "china"] },
  { code: "PKX", name: "Beijing Daxing International", city: "Beijing", country: "China", aliases: ["daxing", "beijing", "china"] },
  { code: "PVG", name: "Shanghai Pudong International", city: "Shanghai", country: "China", aliases: ["pudong", "shanghai", "china"] },
  { code: "SHA", name: "Shanghai Hongqiao International", city: "Shanghai", country: "China", aliases: ["hongqiao", "shanghai", "china"] },
  { code: "CAN", name: "Guangzhou Baiyun International", city: "Guangzhou", country: "China", aliases: ["guangzhou", "baiyun", "canton", "china"] },
  { code: "SZX", name: "Shenzhen Bao'an International", city: "Shenzhen", country: "China", aliases: ["shenzhen", "china"] },
  { code: "CTU", name: "Chengdu Shuangliu International", city: "Chengdu", country: "China", aliases: ["chengdu", "china", "sichuan"] },

  // Indian Ocean & Islands
  { code: "MLE", name: "Velana International Airport", city: "Malé / Maldives", country: "Maldives", aliases: ["maldives", "male", "velana", "atoll", "resort"] },
  { code: "CMB", name: "Bandaranaike International", city: "Colombo", country: "Sri Lanka", aliases: ["colombo", "sri lanka", "bandaranaike"] },
  { code: "MRU", name: "Sir Seewoosagur Ramgoolam Intl", city: "Port Louis / Mauritius", country: "Mauritius", aliases: ["mauritius", "port louis"] },
  { code: "SEZ", name: "Seychelles International Airport", city: "Mahé / Seychelles", country: "Seychelles", aliases: ["seychelles", "mahe", "victoria"] },

  // ================= OCEANIA =================
  { code: "SYD", name: "Sydney Kingsford Smith Airport", city: "Sydney", country: "Australia", aliases: ["sydney", "kingsford smith", "nsw", "australia"] },
  { code: "MEL", name: "Melbourne Airport", city: "Melbourne", country: "Australia", aliases: ["melbourne", "tullamarine", "victoria", "australia"] },
  { code: "BNE", name: "Brisbane Airport", city: "Brisbane", country: "Australia", aliases: ["brisbane", "queensland", "australia", "gold coast"] },
  { code: "PER", name: "Perth Airport", city: "Perth", country: "Australia", aliases: ["perth", "western australia", "australia"] },
  { code: "ADL", name: "Adelaide Airport", city: "Adelaide", country: "Australia", aliases: ["adelaide", "south australia", "australia"] },
  { code: "OOL", name: "Gold Coast Airport", city: "Gold Coast / Coolangatta", country: "Australia", aliases: ["gold coast", "coolangatta", "australia"] },
  { code: "CNS", name: "Cairns Airport", city: "Cairns", country: "Australia", aliases: ["cairns", "great barrier reef", "queensland", "australia"] },
  { code: "AKL", name: "Auckland Airport", city: "Auckland", country: "New Zealand", aliases: ["auckland", "new zealand", "nz"] },
  { code: "CHC", name: "Christchurch International", city: "Christchurch", country: "New Zealand", aliases: ["christchurch", "south island", "new zealand"] },
  { code: "ZQN", name: "Queenstown Airport", city: "Queenstown", country: "New Zealand", aliases: ["queenstown", "new zealand", "ski"] },
  { code: "WLG", name: "Wellington International", city: "Wellington", country: "New Zealand", aliases: ["wellington", "capital", "new zealand"] },
  { code: "NAN", name: "Nadi International Airport", city: "Nadi / Viti Levu", country: "Fiji", aliases: ["fiji", "nadi"] },

  // ================= LATIN AMERICA & CARIBBEAN =================
  { code: "GRU", name: "São Paulo/Guarulhos International", city: "São Paulo", country: "Brazil", aliases: ["sao paulo", "guarulhos", "brazil", "brasil"] },
  { code: "GIG", name: "Rio de Janeiro/Galeão International", city: "Rio de Janeiro", country: "Brazil", aliases: ["rio de janeiro", "galeao", "copacabana", "brazil"] },
  { code: "EZE", name: "Ministro Pistarini (Ezeiza) Intl", city: "Buenos Aires", country: "Argentina", aliases: ["buenos aires", "ezeiza", "argentina"] },
  { code: "AEP", name: "Aeroparque Jorge Newbery", city: "Buenos Aires", country: "Argentina", aliases: ["aeroparque", "buenos aires", "argentina"] },
  { code: "BOG", name: "El Dorado International", city: "Bogotá", country: "Colombia", aliases: ["bogota", "el dorado", "colombia"] },
  { code: "MDE", name: "José María Córdova International", city: "Medellín", country: "Colombia", aliases: ["medellin", "colombia"] },
  { code: "LIM", name: "Jorge Chávez International", city: "Lima", country: "Peru", aliases: ["lima", "jorge chavez", "peru", "machu picchu"] },
  { code: "SCL", name: "Arturo Merino Benítez International", city: "Santiago", country: "Chile", aliases: ["santiago", "chile", "andes"] },
  { code: "PTY", name: "Tocumen International Airport", city: "Panama City", country: "Panama", aliases: ["panama city", "tocumen", "panama", "canal"] },
  { code: "SJO", name: "Juan Santamaría International", city: "San José", country: "Costa Rica", aliases: ["san jose", "costa rica"] },
  { code: "SJU", name: "Luis Muñoz Marín International", city: "San Juan", country: "Puerto Rico", aliases: ["san juan", "puerto rico", "caribbean"] },
  { code: "NAS", name: "Lynden Pindling International", city: "Nassau", country: "Bahamas", aliases: ["nassau", "bahamas", "paradise island", "caribbean"] },
  { code: "MBJ", name: "Sangster International Airport", city: "Montego Bay", country: "Jamaica", aliases: ["montego bay", "jamaica", "caribbean"] },
  { code: "PUJ", name: "Punta Cana International", city: "Punta Cana", country: "Dominican Republic", aliases: ["punta cana", "dominican republic", "caribbean"] },

  // ================= AFRICA =================
  { code: "CAI", name: "Cairo International Airport", city: "Cairo", country: "Egypt", aliases: ["cairo", "egypt", "pyramids", "giza"] },
  { code: "HRG", name: "Hurghada International Airport", city: "Hurghada", country: "Egypt", aliases: ["hurghada", "red sea", "egypt"] },
  { code: "JNB", name: "O.R. Tambo International", city: "Johannesburg", country: "South Africa", aliases: ["johannesburg", "or tambo", "joburg", "south africa"] },
  { code: "CPT", name: "Cape Town International Airport", city: "Cape Town", country: "South Africa", aliases: ["cape town", "south africa", "table mountain"] },
  { code: "NBO", name: "Jomo Kenyatta International", city: "Nairobi", country: "Kenya", aliases: ["nairobi", "kenya", "safari"] },
  { code: "ADD", name: "Addis Ababa Bole International", city: "Addis Ababa", country: "Ethiopia", aliases: ["addis ababa", "bole", "ethiopia"] },
  { code: "CMN", name: "Mohammed V International", city: "Casablanca", country: "Morocco", aliases: ["casablanca", "morocco"] },
  { code: "RAK", name: "Marrakesh Menara Airport", city: "Marrakech", country: "Morocco", aliases: ["marrakech", "marrakesh", "morocco"] },
  { code: "LOS", name: "Murtala Muhammed International", city: "Lagos", country: "Nigeria", aliases: ["lagos", "nigeria"] },
  { code: "ACC", name: "Kotoka International Airport", city: "Accra", country: "Ghana", aliases: ["accra", "ghana"] },
];

/**
 * Top Recommended / Popular Airports for instant display on focus
 */
export const POPULAR_AIRPORTS = [
  { code: "LHR", name: "London Heathrow Airport", city: "London", country: "United Kingdom" },
  { code: "JFK", name: "John F. Kennedy International", city: "New York", country: "United States" },
  { code: "DXB", name: "Dubai International Airport", city: "Dubai", country: "United Arab Emirates" },
  { code: "CDG", name: "Charles de Gaulle Airport", city: "Paris", country: "France" },
  { code: "SIN", name: "Singapore Changi Airport", city: "Singapore", country: "Singapore" },
  { code: "DEL", name: "Indira Gandhi International", city: "Delhi", country: "India" },
  { code: "BOM", name: "Chhatrapati Shivaji Maharaj", city: "Mumbai", country: "India" },
  { code: "HND", name: "Tokyo Haneda Airport", city: "Tokyo", country: "Japan" },
  { code: "LAX", name: "Los Angeles International", city: "Los Angeles", country: "United States" },
  { code: "ZRH", name: "Zurich Airport", city: "Zurich", country: "Switzerland" },
  { code: "AMS", name: "Amsterdam Schiphol", city: "Amsterdam", country: "Netherlands" },
  { code: "FRA", name: "Frankfurt Airport", city: "Frankfurt", country: "Germany" },
];

/**
 * Fast search and ranking algorithm matching Google Flights behavior.
 * Supports:
 * - Exact 3-letter IATA code (instant top rank)
 * - Prefix code (e.g. "LH" -> LHR)
 * - City name exact or prefix (e.g. "Lon" -> London, "New" -> New York)
 * - Airport name match (e.g. "Heathrow", "O'Hare", "De Gaulle")
 * - Country name match (e.g. "Switzerland" -> ZRH, GVA)
 * - Aliases match (e.g. "Alps", "Bali", "Maldives", "Goa")
 */
export function searchAirports(query, limit = 8) {
  if (!query || typeof query !== "string") {
    return POPULAR_AIRPORTS.slice(0, limit);
  }

  const raw = query.trim().toLowerCase();
  if (!raw) {
    return POPULAR_AIRPORTS.slice(0, limit);
  }

  const upperCode = raw.toUpperCase();

  const results = [];

  for (const item of AIRPORTS) {
    let score = 0;
    const code = item.code.toLowerCase();
    const city = item.city.toLowerCase();
    const name = item.name.toLowerCase();
    const country = (item.country || "").toLowerCase();

    // 1. Exact 3-letter IATA code match -> Supreme priority (Score 1000)
    if (code === raw) {
      score += 1000;
    }
    // 2. IATA code prefix (e.g. "lh" for LHR) -> Score 500
    else if (code.startsWith(raw)) {
      score += 500;
    }
    // 3. City exact match -> Score 400
    else if (city === raw) {
      score += 400;
    }
    // 4. City prefix match (e.g. "lon" for London) -> Score 300
    else if (city.startsWith(raw)) {
      score += 300;
    }
    // 5. City word boundary match (e.g. "york" in "New York") -> Score 250
    else if (city.split(/[\s/-]+/).some((w) => w.startsWith(raw))) {
      score += 250;
    }
    // 6. Airport name word prefix match (e.g. "heath" for Heathrow) -> Score 200
    else if (name.split(/[\s/-]+/).some((w) => w.startsWith(raw))) {
      score += 200;
    }
    // 7. Aliases match -> Score 180
    else if (item.aliases && item.aliases.some((a) => a.startsWith(raw) || a === raw)) {
      score += 180;
    }
    // 8. General substring matches -> Score 50 - 100
    else if (city.includes(raw)) {
      score += 100;
    } else if (name.includes(raw)) {
      score += 80;
    } else if (country.startsWith(raw)) {
      score += 70;
    } else if (country.includes(raw)) {
      score += 40;
    }

    if (score > 0) {
      results.push({ item, score });
    }
  }

  // Sort by score descending; if score equal, sort alphabetically by city
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.item.city.localeCompare(b.item.city);
  });

  return results.slice(0, limit).map((r) => r.item);
}

/**
 * Resolves any freeform user input (name, city, country, or code) into a valid 3-letter IATA code.
 */
export function resolveIataCode(input, fallback = "LHR") {
  if (!input) return fallback;
  const trimmed = String(input).trim();
  
  // If user passed a clean 3-letter uppercase code
  if (trimmed.length === 3 && /^[A-Za-z]{3}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  // Check if string contains parentheses like "London (LHR)" or "New York [JFK]"
  const parenMatch = trimmed.match(/\(([A-Za-z]{3})\)/) || trimmed.match(/\[([A-Za-z]{3})\]/);
  if (parenMatch && parenMatch[1]) {
    return parenMatch[1].toUpperCase();
  }

  // Check if starts with 3 letters followed by dash e.g. "LHR - London"
  const prefixMatch = trimmed.match(/^([A-Za-z]{3})\s*[-–—]/);
  if (prefixMatch && prefixMatch[1]) {
    return prefixMatch[1].toUpperCase();
  }

  // Search the dataset and return top match
  const matches = searchAirports(trimmed, 1);
  if (matches.length > 0) {
    return matches[0].code;
  }

  return trimmed.slice(0, 3).toUpperCase() || fallback;
}

/**
 * Returns formatted representation of an airport: e.g. "London (LHR)"
 */
export function formatAirportDisplay(itemOrCode) {
  if (!itemOrCode) return "";
  if (typeof itemOrCode === "object") {
    return `${itemOrCode.city || itemOrCode.name} (${itemOrCode.code})`;
  }
  const code = String(itemOrCode).trim().toUpperCase();
  const found = AIRPORTS.find((a) => a.code === code);
  if (found) {
    return `${found.city} (${found.code})`;
  }
  return code;
}
