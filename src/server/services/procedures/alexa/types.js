const types = require('../../input-types');

const Categories = [
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

module.exports = function registerTypes() {
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
            type: {name: 'Array', params: ['Object']}
        },
        {
            name: 'handler',
            type: {name: 'String'}  // TODO: make this FunctionXML or SerializedFunction?
        },
    ];
    types.defineType('Intent', async (input, _params, ctx) => {
        const intent = await types.parse.Object(input, intentParams);
        await types.parse.Function(intent.handler, _params, ctx);
        const isCustomIntent = !intent.name.startsWith('AMAZON.');
        if (isCustomIntent && !intent.utterances) {
            throw new Error('Custom intents must contain utterances.');
        }
        return intent;
    });

    types.defineType('SkillCategory', input => types.parse.Enum(input, Categories, undefined, 'SkillCategory'));
};
