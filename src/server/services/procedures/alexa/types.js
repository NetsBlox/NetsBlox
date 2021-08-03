const types = require('../../input-types');

const SkillCategories = [
    'ALARMS_AND_CLOCKS',
    'ASTROLOGY',
    'BUSINESS_AND_FINANCE',
    'CALCULATORS',
    'CALENDARS_AND_REMINDERS',
    'CHILDRENS_EDUCATION_AND_REFERENCE',
    'CHILDRENS_GAMES',
    'CHILDRENS_MUSIC_AND_AUDIO',
    'CHILDRENS_NOVELTY_AND_HUMOR',
    'COMMUNICATION',
    'CONNECTED_CAR',
    'COOKING_AND_RECIPE',
    'CURRENCY_GUIDES_AND_CONVERTERS',
    'DATING',
    'DELIVERY_AND_TAKEOUT',
    'DEVICE_TRACKING',
    'EDUCATION_AND_REFERENCE',
    'EVENT_FINDERS',
    'EXERCISE_AND_WORKOUT',
    'FASHION_AND_STYLE',
    'FLIGHT_FINDERS',
    'FRIENDS_AND_FAMILY',
    'GAME_INFO_AND_ACCESSORY',
    'GAMES',
    'HEALTH_AND_FITNESS',
    'HOTEL_FINDERS',
    'KNOWLEDGE_AND_TRIVIA',
    'MOVIE_AND_TV_KNOWLEDGE_AND_TRIVIA',
    'MOVIE_INFO_AND_REVIEWS',
    'MOVIE_SHOWTIMES',
    'MUSIC_AND_AUDIO_ACCESSORIES',
    'MUSIC_AND_AUDIO_KNOWLEDGE_AND_TRIVIA',
    'MUSIC_INFO_REVIEWS_AND_RECOGNITION_SERVICE',
    'NAVIGATION_AND_TRIP_PLANNER',
    'NEWS',
    'NOVELTY',
    'ORGANIZERS_AND_ASSISTANTS',
    'PETS_AND_ANIMAL',
    'PODCAST',
    'PUBLIC_TRANSPORTATION',
    'RELIGION_AND_SPIRITUALITY',
    'RESTAURANT_BOOKING_INFO_AND_REVIEW',
    'SCHOOLS',
    'SCORE_KEEPING',
    'SELF_IMPROVEMENT',
    'SHOPPING',
    'SMART_HOME',
    'SOCIAL_NETWORKING',
    'SPORTS_GAMES',
    'SPORTS_NEWS',
    'STREAMING_SERVICE',
    'TAXI_AND_RIDESHARING',
    'TO_DO_LISTS_AND_NOTES',
    'TRANSLATORS',
    'TV_GUIDES',
    'UNIT_CONVERTERS',
    'WEATHER',
    'WINE_AND_BEVERAGE',
    'ZIP_CODE_LOOKUP',
];

const SlotTypes = [
    'AMAZON.Actor',
    'AMAZON.AdministrativeArea',
    'AMAZON.AggregateRating',
    'AMAZON.Airline',
    'AMAZON.Airport',
    'AMAZON.Anaphor',
    'AMAZON.Animal',
    'AMAZON.Artist',
    'AMAZON.AT_CITY',
    'AMAZON.AT_REGION',
    'AMAZON.Athlete',
    'AMAZON.Author',
    'AMAZON.Book',
    'AMAZON.BookSeries',
    'AMAZON.BroadcastChannel',
    'AMAZON.City',
    'AMAZON.CivicStructure',
    'AMAZON.Color',
    'AMAZON.Comic',
    'AMAZON.Corporation',
    'AMAZON.Country',
    'AMAZON.CreativeWorkType',
    'AMAZON.DayOfWeek',
    'AMAZON.DE_CITY',
    'AMAZON.DE_FIRST_NAME',
    'AMAZON.DE_REGION',
    'AMAZON.Dessert',
    'AMAZON.DeviceType',
    'AMAZON.Director',
    'AMAZON.Drink',
    'AMAZON.EducationalOrganization',
    'AMAZON.EUROPE_CITY',
    'AMAZON.EventType',
    'AMAZON.Festival',
    'AMAZON.FictionalCharacter',
    'AMAZON.FinancialService',
    'AMAZON.FirstName',
    'AMAZON.Food',
    'AMAZON.FoodEstablishment',
    'AMAZON.Game',
    'AMAZON.GB_CITY',
    'AMAZON.GB_FIRST_NAME',
    'AMAZON.GB_REGION',
    'AMAZON.Genre',
    'AMAZON.Landform',
    'AMAZON.LandmarksOrHistoricalBuildings',
    'AMAZON.Language',
    'AMAZON.LocalBusiness',
    'AMAZON.LocalBusinessType',
    'AMAZON.MedicalOrganization',
    'AMAZON.Month',
    'AMAZON.Movie',
    'AMAZON.MovieSeries',
    'AMAZON.MovieTheater',
    'AMAZON.MusicAlbum',
    'AMAZON.MusicCreativeWorkType',
    'AMAZON.MusicEvent',
    'AMAZON.MusicGroup',
    'AMAZON.Musician',
    'AMAZON.MusicPlaylist',
    'AMAZON.MusicRecording',
    'AMAZON.MusicVenue',
    'AMAZON.MusicVideo',
    'AMAZON.Organization',
    'AMAZON.Person',
    'AMAZON.PostalAddress',
    'AMAZON.Professional',
    'AMAZON.ProfessionalType',
    'AMAZON.RadioChannel',
    'AMAZON.Region',
    'AMAZON.RelativePosition',
    'AMAZON.Residence',
    'AMAZON.Room',
    'AMAZON.ScreeningEvent',
    'AMAZON.Service',
    'AMAZON.SocialMediaPlatform',
    'AMAZON.SoftwareApplication',
    'AMAZON.SoftwareGame',
    'AMAZON.Sport',
    'AMAZON.SportsEvent',
    'AMAZON.SportsTeam',
    'AMAZON.StreetAddress',
    'AMAZON.StreetName',
    'AMAZON.TelevisionChannel',
    'AMAZON.TVEpisode',
    'AMAZON.TVSeason',
    'AMAZON.TVSeries',
    'AMAZON.US_CITY',
    'AMAZON.US_FIRST_NAME',
    'AMAZON.US_STATE',
    'AMAZON.VideoGame',
    'AMAZON.VisualModeTrigger',
    'AMAZON.WeatherCondition',
    'AMAZON.WrittenCreativeWorkType',
];

let _registeredTypes = false;
function registerTypes() {
    if (_registeredTypes) return;
    _registeredTypes = true;

    const intentParams = [
        {
            name: 'name',
            type: {name: 'String'}
        },
        {
            name: 'utterances',
            optional: true,
            type: {name: 'Array', params: ['String']}
        },
        {
            name: 'slots',
            optional: true,
            type: {name: 'Array', params: ['Slot']}
        },
        {
            name: 'handler',
            type: {name: 'SerializedFunction'}
        },
    ];
    types.defineType({
        name: 'Intent',
        description: 'An object that holds information about an Alexa intent.',
        baseType: 'Object',
        baseParams: intentParams,
        parser: intent => {
            const isCustomIntent = !intent.name.startsWith('AMAZON.');
            if (isCustomIntent && !intent.utterances) {
                throw new Error('Custom intents must contain utterances.');
            }
            return intent;
        },
    });

    types.defineType({
        name: 'SlotType',
        description: 'The type of slot to use in an Alexa skill.',
        baseType: 'Enum',
        baseParams: SlotTypes,
    });
    const slotParams = [
        {
            name: 'name',
            type: {name: 'String'},
        },
        {
            name: 'type',
            type: {name: 'SlotType'},
        }
    ];
    types.defineType({
        name: 'Slot',
        description: 'Structured data about a slot in an Alexa skill.',
        baseType: 'Object',
        baseParams: slotParams,
    });
    types.defineType({
        name: 'SkillCategory',
        description: 'A category description for an Alexa skill.',
        baseType: 'Enum',
        baseParams: SkillCategories,
    });
}

module.exports = {
    registerTypes,
    SlotTypes,
    SkillCategories,
};
