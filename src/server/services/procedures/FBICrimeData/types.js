const types = require('../../input-types');

const OFFENSE_Data_Controller_OPTIONS = {
    'aggravated assault': 'aggravated-assault',
    'all other larceny': 'all-other-larceny',
    'all other offenses': 'all-other-offenses',
    'animal cruelty': 'animal-cruelty',
    'arson': 'arson',
    'assisting or promoting prostitution': 'assisting-or-promoting-prostitution',
    'bad checks': 'bad-checks',
    'betting': 'betting',
    'bribery': 'bribery',
    'burglary breaking and entering': 'burglary-breaking-and-entering',
    'counterfeiting forgery': 'counterfeiting-forgery',
    'credit card automated teller machine fraud': 'credit-card-automated-teller-machine-fraud',
    'destruction damage vandalism of property': 'destruction-damage-vandalism-of-property',
    'driving under the influence': 'driving-under-the-influence',
    'drug equipment violations': 'drug-equipment-violations',
    'drug violations': 'drug-violations',
    'drunkenness': 'drunkenness',
    'embezzlement': 'embezzlement',
    'extortion blackmail': 'extortion-blackmail',
    'false pretenses swindle confidence game': 'false-pretenses-swindle-confidence-game',
    'fondling': 'fondling',
    'gambling equipment violation': 'gambling-equipment-violation',
    'hacking computer invasion': 'hacking-computer-invasion',
    'human trafficking commerical sex acts': 'human-trafficking-commerical-sex-acts',
    'human trafficking commerical involuntary servitude': 'human-trafficking-commerical-involuntary-servitude',
    'identity theft': 'identity-theft',
    'impersonation': 'impersonation',
    'incest': 'incest',
    'intimidation': 'intimidation',
    'justifiable homicide': 'justifiable-homicide',
    'kidnapping abduction': 'kidnapping-abduction',
    'motor vehicle theft': 'motor-vehicle-theft',
    'murder and nonnegligent manslaughter': 'murder-and-nonnegligent-manslaughter',
    'negligent manslaughter': 'negligent-manslaughter',
    'operating promoting assiting gambling': 'operating-promoting-assiting-gambling',
    'curfew loitering vagrancy violations': 'curfew-loitering-vagrancy-violations',
    'peeping tom': 'peeping-tom',
    'pocket picking': 'pocket-picking',
    'pornography obscence material': 'pornography-obscence-material',
    'prostitution': 'prostitution',
    'purchasing prostitution': 'purchasing-prostitution',
    'purse snatching': 'purse-snatching',
    'rape': 'rape',
    'robbery': 'robbery',
    'sexual assult with an object': 'sexual-assult-with-an-object',  // FIXME: typo?
    'sex offenses non forcible': 'sex-offenses-non-forcible',
    'shoplifting': 'shoplifting',
    'simple assault': 'simple-assault',
    'sodomy': 'sodomy',
    'sports tampering': 'sports-tampering',
    'statutory rape': 'statutory-rape',  // FIXME: typo?
    'stolen property offenses': 'stolen-property-offenses',
    'theft from building': 'theft-from-building',
    'theft from coin operated machine or device': 'theft-from-coin-operated-machine-or-device',
    'theft from motor vehicle': 'theft-from-motor-vehicle',
    'theft of motor vehicle-parts or accessories': 'theft-of-motor-vehicle-parts-or-accessories',
    'weapon law violation': 'weapon-law-violation',
    'welfare fraud': 'welfare-fraud',
    'wire fraud': 'wire-fraud',
    'not specified': 'not-specified',
    'liquor law violations': 'liquor-law-violations',
    'crime against person': 'crime-against-person',
    'crime against property': 'crime-against-property',
    'crime against society': 'crime-against-society',
    'assault offenses': 'assault-offenses',
    'homicide offenses': 'homicide-offenses',
    'human trafficking offenses': 'human-trafficking-offenses',
    'sex offenses': 'sex-offenses',
    'fraud offenses': 'fraud-offenses',
    'larceny theft offenses': 'larceny-theft-offenses',
    'drugs narcotic offenses': 'drugs-narcotic-offenses',
    'gambling offenses': 'gambling-offenses',
    'prostitution offenses': 'prostitution-offenses',
    'all offenses': 'all-offenses',
};

const OFFENSE_Supp_Controller_OPTIONS = {
    'burglary': 'burglary',
    'robbery': 'robbery',
    'not specified': 'not-specified',
    'motor vehicle theft': 'motor-vehicle-theft',
    'larceny': 'larceny'
};

const OFFENSE_Arrest_Controller_OPTIONS = {
    'aggravated assault': 'aggravated-assault', 
    'all other offenses': 'all-other-offenses',
    'arson': 'arson',
    'burglary':'burglary',
    'curfew': 'curfew',
    'disorderly conduct': 'disorderly-conduct',
    'dui':'dui',
    'drug grand total': 'drug-grand-total',
    'drug possession marijuana': 'drug-possession-marijuana',
    'drug possession opium': 'drug-possession-opium',
    'drug possession other': 'drug-possession-other',
    'drug possession subtotal': 'drug-possession-subtotal',
    'drug possession synthetic': 'drug-possession-synthetic',
    'drug sales marijuana': 'drug-sales-marijuana',
    'drug sales opium':'drug-sales-opium',
    'drug sales other': 'drug-sales-other',
    'drug sales subtotal': 'drug-sales-subtotal',
    'drug sales synthetic': 'drug-sales-synthetic',
    'drunkenness': 'drunkenness',
    'embezzlement': 'embezzlement',
    'forgery': 'forgery',
    'fraud': 'fraud',
    'gambling all other': 'gambling-all-other',
    'gambling bookmaking': 'gambling-bookmaking',
    'gambling numbers': 'gambling-numbers',
    'gambling total':'gambling-total',
    'human trafficking commerical':'human-trafficking-commerical',
    'human trafficking servitude':'human-trafficking-servitude',
    'larceny':'larceny',
    'liqour laws':'liqour-laws',
    'motor vehcile theft':'motor-vehcile-theft',
    'murder':'murder',
    'offense against family':'offense-against-family',
    'prostitution':'prostitution',
    'prostitution assisting':'prostitution-assisting',
    'prostitution prostitution':'prostitution-prostitution',
    'prostitution purchasing':'prostitution-purchasing',
    'rape':'rape',
    'robbery':'robbery',
    'runaway':'runaway',
    'sexoffenses':'sex-offenses',
    'simple assault':'simple-assault',
    'stolen property':'stolen-property',
    'suspicion':'suspicion',
    'vagrancy':'vagrancy',
    'vandalism':'vandalism',
    'weapons':'weapons'
};

const OFFENSE_Victim_Controller_OPTIONS = {
    'aggravated assault': 'aggravated-assault',
    'burglary': 'burglary',
    'larceny': 'larceny',
    'motor vehicle theft': 'motor-vehicle-theft',
    'homicide': 'homicide',
    'rape': 'rape',
    'robbery': 'robbery',
    'arson': 'arson',
    'violent crime': 'violent-crime',
    'property crime':'property-crime'
};

const OFFENSE_Data_Variable_OPTIONS={
    'count':'COUNT',
    'weapons':'WEAPONS',
    'linked offense':'LINKEDOFFENSE',
    'suspect using':'SUSPECTUSING',
    'criminal activity':'CRIMINAL_ACTIVITY',
    'property recovered':'PROPERTY_RECOVERED',
    'property stolen':'PROPERTY_STOLEN',
    'bias':'BIAS'
};

const Supplemental_Data_OPTIONS={
    'MVT Recovered': 'MVT_RECOVERED',
    'Offense':'OFFENSE',
    'Offense Sub Category':'OFFENSE_SUB_CATEGORY',
    'Larceny Type': 'LARCENY_TYPE'
};

function registerTypes() {
    types.defineType({
        name: 'OffenseData',
        description: 'NIBRS Offense Count',
        baseType: 'Enum',
        baseParams: OFFENSE_Data_Controller_OPTIONS,
    });

    types.defineType({
        name: 'OffenseSupplemental',
        description: 'Supplemental Data Count',
        baseType: 'Enum',
        baseParams: OFFENSE_Supp_Controller_OPTIONS,
    });

    types.defineType({
        name: 'OffenseArrest',
        description: 'Arrest Demographic Data',
        baseType: 'Enum',
        baseParams: OFFENSE_Arrest_Controller_OPTIONS,
    });

    types.defineType({
        name: 'OffenseVictim',
        description: 'NIBRS Victim Demographic Count',
        baseType: 'Enum',
        baseParams: OFFENSE_Victim_Controller_OPTIONS,
    });

    types.defineType({
        name: 'SuppDataOpt',
        description: 'Type of information to get options for supplemental data.',
        baseType: 'Enum',
        baseParams: Supplemental_Data_OPTIONS,
    });

    types.defineType({
        name: 'OffenseDataOpt',
        description: 'Type of information to get options for offense data.',
        baseType: 'Enum',
        baseParams: OFFENSE_Data_Variable_OPTIONS,
    });

}

module.exports = {registerTypes};
