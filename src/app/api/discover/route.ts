import { NextRequest, NextResponse } from "next/server";

// ── In-memory rate limiter (per IP, sliding window) ──
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 20; // 20 requests per minute per IP
const MAX_RATE_LIMIT_ENTRIES = 10_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    // If map is at capacity, flush expired entries first
    if (rateLimitMap.size >= MAX_RATE_LIMIT_ENTRIES) {
      rateLimitMap.forEach((e, k) => { if (now > e.resetAt) rateLimitMap.delete(k); });
      // If still over cap after flush, reject to prevent memory exhaustion
      if (rateLimitMap.size >= MAX_RATE_LIMIT_ENTRIES) return true;
    }
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

// Periodically clean stale entries to prevent memory leak (every 1 min)
if (typeof globalThis !== "undefined") {
  const cleanup = () => {
    const now = Date.now();
    rateLimitMap.forEach((entry, ip) => {
      if (now > entry.resetAt) rateLimitMap.delete(ip);
    });
    // Also evict expired cache entries
    cache.forEach((entry, key) => {
      if (now - entry.ts > SEVEN_DAYS) cache.delete(key);
    });
  };
  setInterval(cleanup, 30 * 1000).unref?.();
}

// ── In-memory cache with 7-day TTL and LRU eviction (max 500 entries) ──
const cache = new Map<string, { data: DiscoverVendor[]; ts: number }>();
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;

interface DiscoverVendor {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviewCount: number;
  phone: string;
  website: string;
  address: string;
  priceLevel: number;
  googleMapsUrl: string;
  photoUrl: string | null;
}

// ── Mock data generator ──

const MOCK_VENDORS: Record<string, { names: string[]; websites: string[] }> = {
  catering: {
    names: [
      "Golden Fork Catering", "Savory Affairs", "The Elegant Plate", "Farm to Table Events",
      "Bella Cucina Catering", "Silver Spoon Events", "Harvest Table Co.", "The Rustic Kitchen",
      "Divine Bites Catering", "Toast & Co. Catering", "Gourmet Gatherings", "Seasoned Celebrations",
      "The Culinary Collective", "Plated Perfection", "Feast & Flora Catering",
    ],
    websites: ["goldenfork.com", "savoryaffairs.com", "elegantplate.com", "farmtotableevents.com", "bellacucinacatering.com", "silverspoonevents.com", "harvesttableco.com", "rustickitchencatering.com", "divinebites.com", "toastandco.com", "gourmetgatherings.com", "seasonedcelebrations.com", "culinarycollective.com", "platedperfection.com", "feastandflora.com"],
  },
  photography: {
    names: [
      "Luminous Moments Photography", "Captured Bliss Studios", "Golden Hour Photography",
      "Everlasting Frames", "Shutter & Soul", "Wildflower Photography Co.", "The Memory Makers",
      "Light & Love Studios", "Storybook Snaps", "Frame by Frame Photo", "Radiant Photography",
      "Moments in Time Studio", "Dreamy Lens Photography", "Timeless Visuals Co.", "Aperture & Aisle",
    ],
    websites: ["luminousmoments.com", "capturedbliss.com", "goldenhourphoto.com", "everlastingframes.com", "shutterandsoul.com", "wildflowerphoto.co", "thememorymakers.com", "lightandlovestudios.com", "storybooksnaps.com", "framebyframe.com", "radiantphotography.com", "momentsintimestudio.com", "dreamylens.com", "timelessvisuals.co", "apertureandaisle.com"],
  },
  videography: {
    names: [
      "Cinematic Love Films", "Reel Emotions Video", "Motion & Vow Films", "Forever Frame Films",
      "The Wedding Reel", "Storyboard Studios", "True Romance Films", "Lens & Lyric Productions",
      "Eternal Moments Video", "Highlight Reel Co.", "Visionary Wedding Films", "Candid Cinema Co.",
      "Love in Motion Films", "Epic Day Films", "Narrative Wedding Films",
    ],
    websites: ["cinematiclove.com", "reelemotions.com", "motionandvow.com", "foreverframefilms.com", "theweddingreel.com", "storyboardstudios.com", "trueromancefilms.com", "lensandlyric.com", "eternalmomentsvideo.com", "highlightreelco.com", "visionaryweddingfilms.com", "candidcinema.co", "loveinmotionfilms.com", "epicdayfilms.com", "narrativeweddingfilms.com"],
  },
  music: {
    names: [
      "Harmony Wedding Band", "The Celebration Orchestra", "Electric Avenue DJs",
      "Strings Attached Quartet", "Groove Station Entertainment", "Encore Live Music",
      "Silver Sound DJs", "The Wedding Ensemble", "Rhythm & Toast Band", "Starlight Entertainment",
      "Melody Lane Music", "First Dance DJs", "The Love Notes Band", "Beats & Blessings DJs",
      "Serenade Music Co.",
    ],
    websites: ["harmonyweddingband.com", "celebrationorchestra.com", "electricavenuedjs.com", "stringsattached.com", "groovestationent.com", "encorelivemusic.com", "silversounddjs.com", "weddingensemble.com", "rhythmandtoast.com", "starlightent.com", "melodylanemusic.com", "firstdancedjs.com", "lovenotes.band", "beatsandblessings.com", "serenademusic.co"],
  },
  flowers: {
    names: [
      "Petal & Bloom Florals", "Wildflower Studio", "The Bouquet Bar", "Blossom & Vine Florals",
      "Garden Party Flowers", "Stems & Co.", "Enchanted Petals", "Rose & Thistle Floral Design",
      "Fresh Cut Florals", "Flora & Fauna Design", "The Flower Loft", "Bloom Room Studio",
      "Botanical Beauty Florals", "Sweet Stems Floral Co.", "Lush Floral Design",
    ],
    websites: ["petalandbloom.com", "wildflowerstudio.com", "thebouquetbar.com", "blossomandvine.com", "gardenpartyflowers.com", "stemsandco.com", "enchantedpetals.com", "roseandthistle.com", "freshcutflorals.com", "floraandfauna.design", "theflowerloft.com", "bloomroomstudio.com", "botanicalbeauty.com", "sweetstems.co", "lushfloraldesign.com"],
  },
  cake: {
    names: [
      "Sweet Layers Bakery", "The Cake Studio", "Buttercream Dreams", "Sugar & Spice Cakes",
      "Flour & Frosting Co.", "Heavenly Tiers Bakery", "The Fondant Fox", "Crumb & Cream Cakes",
      "Whisk & Bloom Bakery", "Delicate Crumb Cakery", "Confection Connection", "The Sugar Garden",
      "Baked with Love Cakes", "Elegant Icing Co.", "Cake Canvas Bakery",
    ],
    websites: ["sweetlayers.com", "thecakestudio.com", "buttercreamdreams.com", "sugarandspicecakes.com", "flourandfrosting.co", "heavenlytiers.com", "fondantfox.com", "crumbandcream.com", "whiskandbloom.com", "delicatecrumb.com", "confectionconnection.com", "thesugargarden.com", "bakedwithlove.com", "eleganticing.co", "cakecanvas.com"],
  },
  venue: {
    names: [
      "The Grand Ballroom", "Rosewood Estate", "Lakeside Manor", "The Garden Pavilion",
      "Silverlake Vineyard", "The Historic Mill", "Meadow Ridge Estate", "Skyline Rooftop Venue",
      "The Ivory Hall", "Coastal Bluff Events", "The Willow Estate", "Sunset Terrace",
      "Birchwood Manor", "The Crystal Conservatory", "Magnolia Gardens Venue",
    ],
    websites: ["thegrandballroom.com", "rosewoodevents.com", "lakesidemanor.com", "gardenpavilion.com", "silverlakevineyard.com", "historicmill.com", "meadowridge.com", "skylinerooftop.com", "theivoryhall.com", "coastalbluffevents.com", "willowstate.com", "sunsetterrace.com", "birchwoodmanor.com", "crystalconservatory.com", "magnoliagardenvenue.com"],
  },
  "hair & makeup": {
    names: [
      "Blush & Glow Beauty", "Bridal Beauty Bar", "Glam Squad Studio", "The Makeup Atelier",
      "Polished & Pretty", "Rouge Beauty Co.", "Lux Bridal Beauty", "Beauty by Design Studio",
      "Flawless Finish Artistry", "The Bridal Suite Beauty", "Radiant Beauty Co.",
      "Unveil Beauty Studio", "Grace & Glamour Beauty", "Allure Bridal Beauty", "Belle Beauty Collective",
    ],
    websites: ["blushandglow.com", "bridalbeautybar.com", "glamsquadstudio.com", "makeupatel.com", "polishedandpretty.com", "rougebeauty.co", "luxbridalbeauty.com", "beautybydesign.com", "flawlessfinish.com", "bridalsuitbeauty.com", "radiantbeauty.co", "unveilbeauty.com", "graceandglamour.com", "allurebridalbeauty.com", "bellebeauty.co"],
  },
  transport: {
    names: [
      "Elite Limousine Service", "Classic Rides Wedding Cars", "Luxe Transit Co.",
      "Vintage Wheels Events", "Premier Wedding Transport", "Royal Carriage Co.",
      "Elegant Arrivals", "The Wedding Shuttle", "Grand Entrance Limos", "First Class Transit",
      "Chariot & Co.", "Platinum Ride Service", "Dream Ride Rentals", "VIP Wedding Cars",
      "Gatsby Vintage Cars",
    ],
    websites: ["elitelimo.com", "classicridescars.com", "luxetransit.co", "vintagewheelsevents.com", "premierweddingtransport.com", "royalcarriage.co", "elegantarrivals.com", "weddingshuttle.com", "grandentrancelimos.com", "firstclasstransit.com", "chariotandco.com", "platinumride.com", "dreamriderentals.com", "vipweddingcars.com", "gatsbyvintagecars.com"],
  },
  officiant: {
    names: [
      "Sacred Vows Officiant", "Rev. Sarah Mitchell", "Heartfelt Ceremonies", "The Wedding Officiant Co.",
      "Love & Promises Officiant", "Blessed Union Ceremonies", "Rev. James Chen",
      "Ceremonies by Grace", "The Knot Tier Officiant", "Joyful Unions Officiants",
      "Forever After Ceremonies", "With This Ring Officiant", "Vow & Virtue Ceremonies",
      "The Ceremony Studio", "Celebration of Love Officiant",
    ],
    websites: ["sacredvows.com", "revsarahmitchell.com", "heartfeltceremonies.com", "weddingofficiant.co", "loveandpromises.com", "blessedunionceremonies.com", "revjameschen.com", "ceremoniesbygrace.com", "theknottier.com", "joyfulunions.com", "foreverafterceremonies.com", "withthisring.co", "vowandvirtue.com", "theceremonstudio.com", "celebrationoflove.com"],
  },
  other: {
    names: [
      "Sparkle Event Rentals", "Photo Booth Palooza", "Fireworks Fantasy Co.",
      "Love Letters Calligraphy", "Party Props & Co.", "The Stationery Studio",
      "Event Decor Warehouse", "Tent & Table Rentals", "Wedding Planner Plus",
      "Day-of Coordination Co.", "Gift Registry Concierge", "Honeymoon Travel Agency",
      "The Invitation Suite", "Custom Favors Co.", "Wedding Insurance Pros",
    ],
    websites: ["sparkleeventrentals.com", "photoboothpalooza.com", "fireworksfantasy.com", "loveletterscalligraphy.com", "partypropsco.com", "stationerystudio.com", "eventdecorwarehouse.com", "tentandtable.com", "weddingplannerplus.com", "dayofcoordination.co", "giftconcierge.com", "honeymoontravels.com", "invitationsuite.com", "customfavors.co", "weddinginsurancepros.com"],
  },
};

const STREET_NAMES = [
  "Main St", "Oak Ave", "Elm St", "Maple Dr", "Cedar Ln", "Park Blvd", "Washington Ave",
  "Lake Shore Dr", "Vine St", "Broadway", "Market St", "Cherry Ln", "Willow Way", "Sunset Blvd",
  "Highland Ave",
];

function generateMockVendors(category: string, location: string): DiscoverVendor[] {
  const cats = category === "all" ? Object.keys(MOCK_VENDORS) : [category];
  const vendors: DiscoverVendor[] = [];

  for (const cat of cats) {
    const data = MOCK_VENDORS[cat];
    if (!data) continue;

    const count = category === "all" ? 3 : data.names.length;
    for (let i = 0; i < count; i++) {
      const name = data.names[i];
      const rating = Math.round((3.5 + Math.random() * 1.5) * 10) / 10;
      const reviewCount = 10 + Math.floor(Math.random() * 290);
      const streetNum = 100 + Math.floor(Math.random() * 9900);
      const street = STREET_NAMES[i % STREET_NAMES.length];
      const priceLevel = 1 + Math.floor(Math.random() * 4);
      const areaCode = 200 + Math.floor(Math.random() * 799);
      const phone1 = 200 + Math.floor(Math.random() * 800);
      const phone2 = 1000 + Math.floor(Math.random() * 9000);

      vendors.push({
        id: `mock-${cat}-${i}`,
        name,
        category: cat,
        rating: Math.min(rating, 5),
        reviewCount,
        phone: `(${areaCode}) ${phone1}-${phone2}`,
        website: `https://${data.websites[i]}`,
        address: `${streetNum} ${street}, ${location || "New York, NY"}`,
        priceLevel,
        googleMapsUrl: `https://www.google.com/maps/search/${encodeURIComponent(name + " " + (location || ""))}`,
        photoUrl: null,
      });
    }
  }

  return vendors;
}

// ── Google Places API (New) — Text Search ──

// Multiple queries per category to get broader results
const CATEGORY_QUERIES: Record<string, string[]> = {
  all: ["wedding vendors", "event planning services"],
  catering: ["wedding catering", "event catering", "catering company"],
  photography: ["wedding photographer", "portrait photographer", "event photographer"],
  videography: ["wedding videographer", "event videographer", "film production wedding"],
  music: ["wedding DJ", "wedding band", "live music events"],
  flowers: ["wedding florist", "floral designer", "flower shop wedding"],
  cake: ["wedding cake", "custom cakes bakery", "specialty bakery"],
  venue: ["wedding venue", "event venue", "banquet hall", "reception hall"],
  "hair & makeup": ["bridal hair and makeup", "wedding makeup artist", "bridal beauty"],
  transport: ["wedding limousine", "luxury car rental", "wedding transportation"],
  officiant: ["wedding officiant", "marriage officiant", "justice of the peace"],
  other: ["wedding event services", "event rentals", "photo booth rental"],
};

interface PlaceResult {
  displayName?: { text: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  priceLevel?: string;
}

function priceLevelToNumber(pl?: string): number {
  if (!pl) return 2;
  const map: Record<string, number> = {
    PRICE_LEVEL_FREE: 0,
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4,
  };
  return map[pl] ?? 2;
}

async function searchOnce(
  query: string,
  apiKey: string,
  category: string,
): Promise<DiscoverVendor[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.nationalPhoneNumber,places.websiteUri,places.googleMapsUri,places.priceLevel",
    },
    body: JSON.stringify({
      textQuery: query,
      maxResultCount: 20,
      languageCode: "en",
    }),
  });

  const data = await res.json();
  if (!data.places?.length) return [];

  return data.places.map((place: PlaceResult) => ({
    id: place.displayName?.text?.replace(/\s+/g, "-").toLowerCase() || crypto.randomUUID(),
    name: place.displayName?.text || "Unknown",
    category: category === "all" ? "other" : category,
    rating: place.rating || 0,
    reviewCount: place.userRatingCount || 0,
    phone: place.nationalPhoneNumber || "",
    website: place.websiteUri || "",
    address: place.formattedAddress || "",
    priceLevel: priceLevelToNumber(place.priceLevel),
    googleMapsUrl: place.googleMapsUri || "",
    photoUrl: null,
  }));
}

async function fetchFromGooglePlaces(
  category: string,
  location: string,
  radiusMiles: number,
  apiKey: string
): Promise<DiscoverVendor[]> {
  const queries = CATEGORY_QUERIES[category] || ["wedding vendors"];

  // Run all queries in parallel
  const results = await Promise.all(
    queries.map((q) => searchOnce(`${q} near ${location}`, apiKey, category === "all" ? "other" : category))
  );

  // Flatten and deduplicate by name
  const seen = new Set<string>();
  const all: DiscoverVendor[] = [];
  for (const batch of results) {
    for (const v of batch) {
      const key = v.name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        all.push(v);
      }
    }
  }

  // Sort by rating (desc), then review count (desc)
  all.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);

  return all;
}

export async function GET(request: NextRequest) {
  // Rate limiting
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || "all";
  const location = searchParams.get("location") || "";
  const name = searchParams.get("name") || "";
  const radius = parseInt(searchParams.get("radius") || "25", 10);

  if (!location && !name) {
    return NextResponse.json({ error: "Location or name is required" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const isDemo = !apiKey;

  // Check cache
  const cacheKey = `${name}-${category}-${location}-${radius}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < SEVEN_DAYS) {
    return NextResponse.json({ vendors: cached.data, demo: isDemo });
  }

  let vendors: DiscoverVendor[];

  if (isDemo) {
    vendors = generateMockVendors(category, location || "your area");
    // Filter mock results by name if provided
    if (name) {
      const lower = name.toLowerCase();
      vendors = vendors.filter((v) => v.name.toLowerCase().includes(lower));
    }
  } else if (name) {
    // Direct name/keyword search — single query, ignores category
    try {
      const query = location ? `${name} near ${location}` : name;
      vendors = await searchOnce(query, apiKey, category === "all" ? "other" : category);
    } catch {
      vendors = [];
    }
  } else {
    try {
      vendors = await fetchFromGooglePlaces(category, location, radius, apiKey);
    } catch {
      vendors = generateMockVendors(category, location);
    }
  }

  // Store in cache (evict oldest if full)
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
  cache.set(cacheKey, { data: vendors, ts: Date.now() });

  return NextResponse.json({ vendors, demo: isDemo });
}
