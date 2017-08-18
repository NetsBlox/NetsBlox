function cronString(interval, wuResponseDelay){
    //  wuResponseDelay max delay time between requesting for updates and getting em.
    interval = interval + wuResponseDelay;
    let minutes = Math.floor(interval/60);
    let secs = interval%60;
    minutes = minutes === 0 ? '*' : `*/${minutes}`;
    return `${secs} ${minutes} * * * *`;
}

module.exports = {
    cronString
};
