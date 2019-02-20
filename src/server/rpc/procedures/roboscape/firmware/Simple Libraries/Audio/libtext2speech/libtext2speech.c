#include "simpletools.h"
#include "text2speech.h"

#define sound_port (10)

talk *spkr;

void main()
{
  spkr = talk_run(sound_port, 9);
  talk_set_speaker(spkr, 0, 90);
  talk_set_speaker(spkr, 1, 110);
  talk_set_speaker(spkr, 2, 100);
  talk_say(spkr, "#1mae d\'og~ is n/ot u k\\at. its tr\'\'%125oo%. ae can pr\'\'%150oo%v it.");
  talk_say(spkr, "#0en espany/oal porfuv/or.");
  talk_say(spkr, "#1%80mee p\'ayrroa n/oa es] oon g\'ahtoa. e es va rd\'ad. pw/aydoa ]proab\'\'arloa...");
  talk_say(spkr, "#0kan y\'oo spell misis//ipee. #1%75++sh\'\'oo]]er ae kan.");
  talk_spell(spkr, "Mississippi");
  talk_say(spkr, ".misis\'ipee. #0v\'\'a ree g//uu\\\\uud%...");
  talk_say(spkr, "#1aem g\'oing too t\'el yoo u s\'eecret. (dhu proapeler is uh reelee kool~ chip)...");
  // Kinda noisy. Must be some overflow happening...
  talk_say(spkr, "#0%75sh\'ee sels s\'eeshels bae dhu s\'eeshor.");
  talk_say(spkr, "#1%50p\'eeter p\'aeper pikt u pek~, uv p\'ikuld p\'epers.");
  talk_say(spkr, "#0%75r\'uber b\'aebee b\'ugee b\'umpers...");
  talk_say(spkr, "#2f\'oaer sc\'oaer and s\'even yeeers agoa, ouer f\'odhers brot forth on dhis c\'ontinent a n\'ew n\'ayshun;");
  talk_say(spkr, "cuns\'eevd in l\'ibertee, and d\'edicayted too dhu propoas\'ishun~ dhat ol men ar cree\'ayted \'eekwul.");
  talk_say(spkr, "n/ow w\\ee ar \\eng/\'ayj~d in u gr\'ayt s\'ivil w\'ar, t\'esting hwedher dh\'at n\'ayshun, or /\'an\\ee n\'ayshun");
  talk_say(spkr, "s/\'oa cons\'\\eevd and s/\'oa d\'\\edicayted can l/\'ong end\'\\ooer...");
  talk_say(spkr, "#0kan yoo res\'aet anee p/oaetree. #1%75++sh\'\'oo]]er ae kan..");
  talk_say(spkr, "#1%75dhayer w/uns ]wus a m/an ]frum nant\'uke");
  talk_say(spkr, "}#0+5woa, ]woa, ]w\\\\\\oa. yoo c\'\'ant tel dh/\'at w\\un h/ee\\er.");
  talk_say(spkr, "#1%75but ae doant n\'oa anee cl/een wu\\ns...");
  talk_say(spkr, "#2wun~, too, three, for, faev, siks, s\'even~, ayt, naen~, ten~, el\'even~, twelv, th\'irteen~, f\'orteen~, f\'ifteen~,");
  talk_say(spkr, "s\'iksteen~, s\'eventeen~, \'aytteen~, n\'aenteen~, tw\'entee, th\'irtee, f\'ortee, f\'iftee, s\'ikstee, s\'eventee,");
  talk_say(spkr, "\'aytee, n\'aentee, h\'undred, th\'ousand, m\'ilyun~, b\'ilyun~, tr\'ilyun~, kwodr\'ilyun~, kwint\'ilyun~, sekst\'ilyun~...");
  talk_say(spkr, "first, s\'ecund, third, forth, fifth, siksth, s\'eventh, aytth, naenth, tenth...");
  talk_say(spkr, "see m\'ayjer. C2doa,Dray,Emee,Ffah,Gsoal,Alah,Btee,C3d%200oa.");
  talk_say(spkr, "see m\'aener. C2doa,Dray,E-mee,Ffah,Gsoal,A-lah,Btee,C3d%200oa.");
  talk_say(spkr, "=1C2o<Do<Eo<Fo<Go<Ao<Bo<C3%400o%...");
  talk_say(spkr, "#1aybee+7seedee++ee ef--jee, --aychae-jaykay--elemenoa--pee, +7kewar--esand-teeew--vee, +5dubul--yewand-ekswae--z%150ee%;");
  talk_say(spkr, "_nowyoov+7herdmae++aybee--sees, --telmee-wutyoo--thinkuv--m%200ee%...");
  talk_say(spkr, "+4mai--ree --had ++u ++litul lam, its --flees wus ++waet --as --sn%200oa%}}.");
  talk_say(spkr, "++and~ ++evr--ee --wa er ++dhat~ ++mairee went, dhe --lam wuz ++shuur --too --g%200oa%...");
  talk_say(spkr, "#1guud~ m[[oa\\\\rning~ ch/ip. [mae n\\aim~ is proap/e\\eler. aem~ r\'edee for mae [first l\'\\esun now.");
}

