CON

  _clkmode      = xtal1 + pll16x
  _xinfreq      = 5_000_000
  
  sound_port    = 10

OBJ

  t : "talk"

PUB start

  t.start(sound_port)
  t.set_speaker(0, 90)
  t.set_speaker(1, 110)
  t.set_speaker(2, 100)  

  'Español:

    t.say(string("#1mae d'og~ is n/ot u k\at. its tr''%125oo%. ae can pr''%150oo%v it."))
    t.say(string("#0en espany/oal porfuv/or."))
    t.say(string("#1%80mee p'ayrroa n/oa es] oon g'ahtoa. e es va rd'ad. pw/aydoa ]proab''arloa..."))

  'Spelling:

    t.say(string("#0kan y'oo spell misis//ipee. #1%75++sh''oo]]er ae kan."))
    t.spell(string("Mississippi"))
    t.say(string(".misis'ipee. #0v''a ree g//uu\\uud%..."))

  'Whisper:

    t.say(string("#1aem g'oing too t'el yoo u s'eecret. (dhu proapeler is uh reelee kool~ chip)..."))

  'Twisters:

    t.say(string("#0%75sh'ee sels s'eeshels bae dhu s'eeshor.")) 'Kinda noisy. Must be some overflow happening...
    t.say(string("#1%50p'eeter p'aeper pikt u pek~, uv p'ikuld p'epers."))
    t.say(string("#0%75r'uber b'aebee b'ugee b'umpers..."))

  'Gettysburg Address:

    t.say(string("#2f'oaer sc'oaer and s'even yeeers agoa, ouer f'odhers brot forth on dhis c'ontinent a n'ew n'ayshun;"))
    t.say(string("cuns'eevd in l'ibertee, and d'edicayted too dhu propoas'ishun~ dhat ol men ar cree'ayted 'eekwul."))
    t.say(string("n/ow w\ee ar \eng/'ayj~d in u gr'ayt s'ivil w'ar, t'esting hwedher dh'at n'ayshun, or /'an\ee n'ayshun"))
    t.say(string("s/'oa cons'\eevd and s/'oa d'\edicayted can l/'ong end'\ooer..."))

  'Limerick:

    t.say(string("#0kan yoo res'aet anee p/oaetree. #1%75++sh''oo]]er ae kan..")) 
    t.say(string("#1%75dhayer w/uns ]wus a m/an ]frum nant'uke"))
    t.say(string("}#0+5woa, ]woa, ]w\\\oa. yoo c''ant tel dh/'at w\un h/ee\er."))
    t.say(string("#1%75but ae doant n'oa anee cl/een wu\ns..."))

  'Cardinals:

    t.say(string("#2wun~, too, three, for, faev, siks, s'even~, ayt, naen~, ten~, el'even~, twelv, th'irteen~, f'orteen~, f'ifteen~,"))
    t.say(string("s'iksteen~, s'eventeen~, 'aytteen~, n'aenteen~, tw'entee, th'irtee, f'ortee, f'iftee, s'ikstee, s'eventee,"))
    t.say(string("'aytee, n'aentee, h'undred, th'ousand, m'ilyun~, b'ilyun~, tr'ilyun~, kwodr'ilyun~, kwint'ilyun~, sekst'ilyun~..."))

  'Ordinals:

    t.say(string("first, s'ecund, third, forth, fifth, siksth, s'eventh, aytth, naenth, tenth..."))

  'Scale:

    t.say(string("see m'ayjer. C2doa,Dray,Emee,Ffah,Gsoal,Alah,Btee,C3d%200oa."))
    t.say(string("see m'aener. C2doa,Dray,E-mee,Ffah,Gsoal,A-lah,Btee,C3d%200oa."))
    t.say(string("=1C2o<Do<Eo<Fo<Go<Ao<Bo<C3%400o%..."))

  'ABC Song:

    t.say(string("#1aybee+7seedee++ee ef--jee, --aychae-jaykay--elemenoa--pee, +7kewar--esand-teeew--vee, +5dubul--yewand-ekswae--z%150ee%;"))
    t.say(string("_nowyoov+7herdmae++aybee--sees, --telmee-wutyoo--thinkuv--m%200ee%..."))  

  'Mary Had a Little Lamb:

    t.say(string("+4mai--ree --had ++u ++litul lam, its --flees wus ++waet --as --sn%200oa%}}."))
    t.say(string("++and~ ++evr--ee --wa er ++dhat~ ++mairee went, dhe --lam wuz ++shuur --too --g%200oa%..."))

  '2006: A Parallax Odyssey: 

    t.say(string("#1guud~ m[[oa\\rning~ ch/ip. [mae n\aim~ is proap/e\eler. aem~ r'edee for mae [first l'\esun now."))