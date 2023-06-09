import { APIMessageComponentEmoji } from 'discord.js';

const Emojis = {
	function: {
		'off': '<:off:963883351016611870>',
		'on': '<:on:963883351012417667>',
		'warn': '<:def:963883350970486814>',

		'cross': '<:cross:946803403256913982>',
		'default': '<:default:946803403630190642>',
		'emergency': '<:emergency:946803403743461446>',
		'pending': '<:pending:946803403630190643>',
		'tick': '<:tick:946803403454050325>',
	},
	customBadges: {
		'staff': '<:bot_staff:831039365680857098>',
		'support': '<:bot_donator:831039365375197185>',
		'verified': '<:bot_verified:831039364804640789>',
		'beta': '<:bot_beta:831039364825350164>',
		'member': '<:bot_member:831039365303107654>',
	},
	newBadges: {
		'admin': '<:admin:1112696834398367754>',
		'artist': '<:artist:1112696837061742612>',
		'member': '<:ember:1112696838609444915>',
		'settings': '<:settings:1112696849065840732>',
		'shield': '<:shield:1112696847039991908>',
		'staff': '<:taff:1112696845219659928>',
		'star': '<:star:1112696841579003955>',
		'wrench': '<:wrench:1112696843265130506>',
	},
	discordBadges: {
		'bug': '<:bugs:947273019431206932>',
		'staff': '<:staff:947273019187920947>',
		'bug2': '<:bug2:947273019133395005>',
		'supporter': '<:supporter:947273019359899669>',
		'partner': '<:partner:947273019892580382>',
		'hype': '<:hypesquad:947273019829653504>',
		'dev': '<:developer:947273019913539644>',
		'mod': '<:moderator:947273019355697184>',
	},
	fromMyServer: {
		'settings': '<:settings:1009847260143689808>',
		'correct': '<:correct:1009437102963966052>',
		'error': '<:error:1009135710776864800>',
		'follow': '<:follow:1009199559186063411>',
		'link': '<:link:1009132883291676702>',
		'warn': '<:warn:1014937583521902634>',
		'dot': '<:bluedot:1089675990759915610>',
	},
	yuna: {
		'angry': '<:YunaAngry:1002239605397008444>',
		'cry': '<:YunaCry:1002239607770992722>',
		'cry2': '<:YunaCry2:1002239610409189457>',
		'happy': '<:YunaHappy:1002239612909015110>',
		'hehe': '<:YunaHehe:1002239615505281055>',
		'hide': '<:YunaHide:1002239617942180000>',
		'hide2': '<:YunaHide2:1002239622849499188>',
		'kill': '<:YunaKill:1002239625391263754>',
		'love': '<:YunaLove:1002239627886874744>',
		'meh': '<:YunaMeh:1002239630667694110>',
		'what': '<:YunaWhat:1002239633414967377>',
		'panic': '<:YunaPanic:1002239635642134619>',
		'pf': '<:YunaPf:1002239638569746442>',
		'scary': '<:YunaScary:1002239641405095966>',
		'sip': '<:YunaSip:1002239643888123934>',
		'uwu': '<:YunaUwu:1002239599948595342>',
		'think': '<:YunaThink:1002239646505390110>',
		'tongue': '<:YunaTongue:1002239597843066880>',
		'wow': '<:YunaWow:1002239602419044374>',
	},
	status: {
		'online': '<:online:951873726553653288>',
		'idle': '<:idle:951873726016790549>',
		'dnd': '<:dnd:951873726054563911>',
		'offline': '<:offline:951873726528503868>',
		'streaming': '<:streaming:951873725983248404>',
	},
	main: {
		'icons_activities': '<:icons_activities:949635040021721138>',
		'icons_announce': '<:icons_announce:859424400456679445>',
		'icons_archive': '<:icons_archive:869507189797158953>',
		'icons_audiodisable': '<:icons_audiodisable:875395222593478767>',
		'icons_audioenable': '<:icons_audioenable:875395222291513354>',
		'icons_award': '<:icons_award:869513411103424563>',
		'icons_awardcup': '<:icons_awardcup:875395223419777085>',
		'icons_backforward': '<:icons_backforward:988409328698523708>',
		'icons_badping': '<:icons_badping:880113405007114271>',
		'icons_ban': '<:icons_ban:859424400968646676>',
		'icons_bank': '<:icons_bank:949635040252428318>',
		'icons_birdman': '<:icons_birdman:869538073996845056>',
		'icons_box': '<:icons_box:869507189298040833>',
		'icons_bright': '<:icons_bright:859388129038303252>',
		'icons_Bugs': '<:icons_Bugs:859388130803974174>',
		'icons_bulb': '<:icons_bulb:882595243579559958>',
		'icons_calendar1': '<:icons_calendar1:941679946760351794>',
		'icons_callconnect': '<:icons_callconnect:875395223428161576>',
		'icons_calldecline': '<:icons_calldecline:948168205371858954>',
		'icons_calldisconnect': '<:icons_calldisconnect:875395223147139122>',
		'icons_channel': '<:icons_channel:859424401950113822>',
		'icons_clock': '<:icons_clock:964491800465276940>',
		'icons_coin': '<:icons_coin:875397816523030558>',
		'icons_colorboostnitro': '<:icons_colorboostnitro:869528229436858378>',
		'icons_colornitro': '<:icons_colornitro:869528229193584650> ',
		'icons_colorserverpartner': '<:icons_colorserverpartner:869529747447746600>',
		'icons_colorserververified': '<:icons_colorserververified:869529747846234162>',
		'icons_colorstaff': '<:icons_colorstaff:869554761840603196>',
		'icons_connect': '<:icons_connect:875395223512047626>',
		'icons_Correct': '<:icons_Correct:859388130411282442>',
		'icons_creditcard': '<:icons_creditcard:882595243793473566>',
		'icons_customstaff': '<:icons_customstaff:988409331793948742>',
		'icons_dblurple': '<:icons_dblurple:875710295258046535>',
		'icons_delete': '<:icons_delete:867650498030731315>',
		'icons_dfuchsia': '<:icons_dfuchsia:875710295081910292>',
		'icons_dgreen': '<:icons_dgreen:875710296147255347>',
		'icons_discover': '<:icons_discover:859429432535023666>',
		'icons_djoin': '<:icons_djoin:875754472834469948>',
		'icons_dleave': '<:icons_dleave:875754473023229972>',
		'icons_dollar': '<:icons_dollar:988409333782020216>',
		'icons_Download': '<:icons_Download:859388129269776384>',
		'icons_downvote': '<:icons_downvote:911135418420953138>',
		'icons_dred': '<:icons_dred:875710295866216509>',
		'icons_dwhite': '<:icons_dwhite:875710295253848144>',
		'icons_dyellow': '<:icons_dyellow:875710296071757824>',
		'icons_edit': '<:icons_edit:859388129625374720>',
		'icons_emojiguardian': '<:icons_emojiguardian:874587985218244649>',
		'icons_eventcolour': '<:icons_eventcolour:870646213429563445>',
		'icons_exclamation': '<:icons_exclamation:859388127885131796>',
		'icons_file': '<:icons_file:859424401899651072> ',
		'icons_fire': '<:icons_fire:869513411044724746>',
		'icons_forum': '<:icons_forum:964425853138264094>',
		'icons_forumNFSW': '<:icons_forumNFSW:964425853582852138>',
		'icons_frontforward': '<:icons_frontforward:988409335791124551>',
		'icons_gitbranch': '<:icons_gitbranch:869507190552166460>',
		'icons_gitcommit': '<:icons_gitcommit:869507190199828490>',
		'icons_gitmerge': '<:icons_gitmerge:869507189549723718>',
		'icons_gitpullrequest': '<:icons_gitpullrequest:869507190057234433>',
		'icons_globe': '<:icons_globe:859424401971609600>',
		'icons_goodping': '<:icons_goodping:880113406915538995>',
		'icons_hammer': '<:icons_hammer:949635040424374342>',
		'icons_headphone': '<:icons_headphone:859424401274568744>',
		'icons_headphonedeafen': '<:icons_headphonedeafen:859424401035100200>',
		'icons_hyphen': '<:icons_hyphen:859388129596014592>',
		'icons_idelping': '<:icons_idelping:880113405720145990>',
		'icons_illustrator': '<:icons_illustrator:949635040168538132>',
		'icons_info': '<:icons_info:880113401207095346>',
		'icons_invite': '<:icons_invite:859424400750542858>',
		'icons_join': '<:icons_join:860487640720343071>',
		'icons_kick': '<:icons_kick:859424400557604886>',
		'icons_kick1': '<:icons_kick:950409450966110269>',
		'icons_leave': '<:icons_leave:860487640113217546>',
		'icons_link': '<:icons_link:859388126875484180>',
		'icons_linked': '<:icons_linked:875395222962585660>',
		'icons_live': '<:icons_live:859424401014128660>',
		'icons_loading': '<:icons_loading:859424401036148776> ',
		'icons_magicwand': '<:icons_magicwand:875754473706893362>',
		'icons_mashroomman': '<:icons_mashroomman:869538073581617193>',
		'icons_mentalhealth': '<:icons_mentalhealth:875395223583350855>',
		'icons_mic': '<:icons_mic:859424401198678017>',
		'icons_micmute': '<:icons_micmute:859424401970561024>',
		'icons_monitor': '<:icons_monitor:866583417138839563>',
		'icons_musicstop': '<:icons_musicstop:988409337837924422>',
		'icons_newmembers': '<:icons_newmembers:964425853410893874>',
		'icons_night': '<:icons_night:859388130636333066>',
		'icons_nitro': '<:icons_nitro:859424400812802048>',
		'icons_nitroboost': '<:icons_nitroboost:859424401514168341>',
		'icons_owner': '<:icons_owner:859429432380227594>',
		'icons_paintpadbrush': '<:icons_paintpadbrush:882595244380667944>',
		'icons_pause': '<:icons_pause:988409339851198495>',
		'icons_paypal': '<:icons_paypal:944118377520197702>',
		'icons_pen': '<:icons_pen:869507189553922061>',
		'icons_people': '<:icons_people:964425853930995783>',
		'icons_Person': '<:icons_Person:859388129932214292>',
		'icons_photoshop': '<:icons_photoshop:949635040038490163>',
		'icons_pin': '<:icons_pin:859388130598715392>',
		'icons_ping': '<:icons_ping:859424401324900352>',
		'icons_play': '<:icons_play:988409341784768533>',
		'icons_plus': '<:icons_plus:988409343743496232>',
		'icons_podcast': '<:icons_podcast:859424401304846366>',
		'icons_premiumchannel': '<:icons_premiumchannel:964425853616422922>',
		'icons_reminder': '<:icons_reminder:859388128364199946> ',
		'icons_repeat': '<:icons_repeat:988409346637594744>',
		'icons_repeatonce': '<:icons_repeatonce:988409348826992680>',
		'icons_reply': '<:icons_reply:859388126153932802>',
		'icons_rightarrow': '<:icons_rightarrow:859388126653186058>',
		'icons_saturn': '<:icons_saturn:941683992409804850>',
		'icons_screenshare': '<:icons_screenshare:859424401186095114>',
		'icons_search': '<:icons_search:859424401723883560>',
		'icons_sentry': '<:icons_sentry:969499099671957565>',
		'icons_servermute': '<:icons_servermute:988409351976935447>',
		'icons_settings': '<:icons_settings:859388128040976384>',
		'icons_share': '<:icons_share:869507190380171344>',
		'icons_shine1': '<:icons_shine1:859424400959602718>',
		'icons_shine2': '<:icons_shine2:859424401472356372>',
		'icons_shine3': '<:icons_shine3:859424401061970021>',
		'icons_splash': '<:icons_splash:859426808461525044>',
		'icons_star': '<:icons_star:859388127880544296>',
		'icons_store': '<:icons_store:875395222673186817>',
		'icons_text1': '<:icons_text1:875985515357282316>',
		'icons_text2': '<:icons_text2:875985515701231677>',
		'icons_text3': '<:icons_text3:875985515948679208>',
		'icons_text4': '<:icons_text4:920259058164989973>',
		'icons_text5': '<:icons_text5:920259712728072252>',
		'icons_text6': '<:icons_text6:920260975112888330>',
		'icons_timeout': '<:icons_timeout:930797536900415548>',
		'icons_transferownership': '<:icons_transferownership:869559200047570955>',
		'icons_upvote': '<:icons_upvote:909715386843430933> ',
		'icons_verified': '<:icons_verified:859424400939286549>',
		'icons_video': '<:icons_video:859424401552572446>',
		'icons_Wrong': '<:icons_Wrong:859388130636988436>',
		'icons_wumpus': '<:icons_wumpus:859424402416336906>',
		'iconslogo': '<:Iconslogo:950417237683105912>',
		'icons_bookmark': '<:icons_bookmark:860123644037824512>',
		'icons_busy': '<:icons_busy:860123643219410965>',
		'icons_camera': '<:icons_camera:860123644331163648>',
		'icons_clouddown': '<:icons_clouddown:860133546776985610>',
		'icons_code': '<:icons_code:860123643563474955>',
		'icons_control': '<:icons_control:860123644650323988>',
		'icons_downarrow': '<:icons_downarrow:860123643300675605>',
		'icons_education': '<:icons_education:860123644457648128>',
		'icons_flag': '<:icons_flag:860123644058664990>',
		'icons_folder': '<:icons_folder:860123643659681802>',
		'icons_fword': '<:icons_fword:861124851954876416>',
		'icons_games': '<:icons_games:860123644402335775>',
		'icons_gif': '<:icons_gif:861124851531644939>',
		'icons_gift': '<:icons_gift:860123643710668851>',
		'icons_heart': '<:icons_heart:860123644235743232>',
		'icons_hi': '<:icons_hi:860123644205072395>',
		'icons_id': '<:icons_id:860133546102620190>',
		'icons_idle': '<:icons_idle:860123644265365514>',
		'icons_image': '<:icons_image:861124851828523038>',
		'icons_leftarrow': '<:icons_leftarrow:860123643816312852>',
		'icons_list': '<:icons_list:860123643710537789>',
		'icons_loadingerror': '<:icons_loadingerror:860133545681616907>',
		'icons_message': '<:icons_message:860123644545204234>',
		'icons_music': '<:icons_music:860123644201271326>',
		'icons_notify': '<:icons_notify:860123644621226004>',
		'icons_off': '<:icons_off:860499265289191434>',
		'icons_offline': '<:icons_offline:860123643954462740> ',
		'icons_on': '<:icons_on:860499265947959326>',
		'icons_online': '<:icons_online:860123643395571713>',
		'icons_outage': '<:icons_outage:868122243845206087>',
		'icons_premium': '<:icons_premium:860508110920613918>',
		'icons_question': '<:icons_question:860133545905225768>',
		'icons_quotes': '<:icons_quotes:860123643887091723>',
		'icons_richpresence': '<:icons_richpresence:860133546173923388>',
		'icons_rules': '<:icons_rules:860123643756281876>',
		'icons_slashcmd': '<:icons_slashcmd:860133546315218944>',
		'icons_spark': '<:icons_spark:860123643722727444>',
		'icons_speaker': '<:icons_speaker:860133545544908802>',
		'icons_speakerlock': '<:icons_speakerlock:860133546010345472>',
		'icons_speakerlow': '<:icons_speakerlow:860133546278387763>',
		'icons_speakermute': '<:icons_speakermute:860133545963159563>',
		'icons_stickers': '<:icons_stickers:861124851435831317>',
		'icons_stream': '<:icons_stream:860123644453715978>',
		'icons_ticket': '<:icons_ticket:860123644520562698>',
		'icons_tilde': '<:icons_tilde:860133545682141204>',
		'icons_todolist': '<:icons_todolist:860123644196683807>',
		'icons_uparrow': '<:icons_uparrow:860123643715125279>',
		'icons_update': '<:icons_update:860123644297871382>',
		'icons_view': '<:icons_view:860123644398534676>',
		'icons_vip': '<:icons_vip:860133545884123136>',
		'icons_addreactions': '<:icons_addreactions:866920224581746698>',
		'icons_aka': '<:icons_aka:861852633333628928>',
		'icons_behance': '<:icons_behance:861919741642539018>',
		'icons_beta': '<:icons_beta:861852632725585920>',
		'icons_bots': '<:icons_bots:865488228789649429>',
		'icons_clean': '<:icons_clean:861852633799065660>',
		'icons_defaultperms': '<:icons_defaultperms:866943907698180137>',
		'icons_discordbotdev': '<:icons_discordbotdev:861852633433636864>',
		'icons_discordbughunter': '<:icons_discordbughunter:861852633195347988>',
		'icons_discordhypesquard': '<:icons_discordhypesquard:861852632757829632>',
		'icons_discordmod': '<:icons_discordmod:861852632863211540>',
		'icons_discordnitro': '<:icons_discordnitro:861852633592758302>',
		'icons_discordpartner': '<:icons_discordpartner:861852633027182612>',
		'icons_discordstaff': '<:icons_discordstaff:861852633119326218>',
		'icons_dislike': '<:icons_dislike:865488228642848778>',
		'icons_earlysupporter': '<:icons_earlysupporter:861852633505071104>',
		'icons_fb': '<:icons_fb:861919740217393153>',
		'icons_figma': '<:icons_figma:861863653577719818>',
		'icons_files': '<:icons_files:865488228387651584>',
		'icons_friends': '<:icons_friends:861852632767528970>',
		'icons_github': '<:icons_github:861919741836656671>',
		'icons_hoursglass': '<:icons_hoursglass:866943907278094338>',
		'icons_HSbalance': '<:icons_HSbalance:861852632829919282>',
		'icons_HSbravery': '<:icons_HSbravery:861852632858492928> ',
		'icons_HSbrilliance': '<:icons_HSbrilliance:861920754094178304>',
		'icons_instagram': '<:icons_instagram:889394485807677450>',
		'icons_kicking': '<:icons_kicking:866943907131424799>',
		'icons_kofi': '<:icons_kofi:866946908912353280>',
		'icons_like': '<:icons_like:865488228719394876>',
		'icons_locked': '<:icons_locked:861852633193906177>',
		'icons_loop': '<:icons_loop:861852632893227029>',
		'icons_menu': '<:icons_menu:861852633617661983>',
		'icons_MSvisualcode': '<:icons_MSvisualcode:861863653561335829>',
		'icons_musicstop1': '<:icons_musicstop:861852633979420712>',
		'icons_New': '<:icons_New:861852632774869034>',
		'icons_partner': '<:icons_partner:866943907152920576>',
		'icons_patreon': '<:icons_patreon:861919741244735488>',
		'icons_pause1': '<:icons_pause:861852632914198548>',
		'icons_pings': '<:icons_pings:866944313630654465>',
		'icons_play1': '<:icons_play:861852632800952320>',
		'icons_queue': '<:icons_queue:861852633240961024>',
		'icons_reddit': '<:icons_reddit:861919740775890944>',
		'icons_serverpartner': '<:icons_serverpartner:861920753930469376>',
		'icons_serververified': '<:icons_serververified:861920754755960832>',
		'icons_snapchat': '<:icons_snapchat:861919740984557568>',
		'icons_supportteam': '<:icons_supportteam:861863654710706196>',
		'icons_twitter': '<:icons_twitter:861863654097682452>',
		'icons_unlock': '<:icons_unlock:861864835778871297>',
		'icons_youtube': '<:icons_youtube:861863653962416128>',
		'icons_banmembers': '<:icons_banmembers:866943415361732628>',
		'icons_channelfollowed': '<:icons_channelfollowed:866599434375528488>',
		'icons_createcategory': '<:icons_createcategory:866599433687793685>',
		'icons_createchannel': '<:icons_createchannel:866943415643799552>',
		'icons_createchannels': '<:icons_createchannels:866599433574678559>',
		'icons_createemoji': '<:icons_createemoji:866943416474796062>',
		'icons_createintegration': '<:icons_createintegration:866943415329226782>',
		'icons_createrole': '<:icons_createrole:866943415774478388>',
		'icons_createsticker': '<:icons_createsticker:866943415370514442>',
		'icons_createthread': '<:icons_createthread:866943416251973672>',
		'icons_createwebhook': '<:icons_createwebhook:866943414729965590>',
		'icons_deletechannel': '<:icons_deletechannel:866943415396990987>',
		'icons_deleteemoji': '<:icons_deleteemoji:866943415090413589>',
		'icons_deleteevent': '<:icons_deleteevent:866943416226152468>',
		'icons_deleteintegration': '<:icons_deleteintegration:866943415915642931>',
		'icons_deleterole': '<:icons_deleterole:866943415895851018>',
		'icons_deletesticker': '<:icons_deletesticker:866943415912497163>',
		'icons_deletethread': '<:icons_deletethread:866943415988256798>',
		'icons_deletewebhook': '<:icons_deletewebhook:866943415094476830>',
		'icons_disable': '<:icons_disable:866599433712828477>',
		'icons_Discord': '<:icons_Discord:866329296020701218>',
		'icons_enable': '<:icons_enable:866599434866786324>',
		'icons_endstage': '<:icons_endstage:866943416377933824> ',
		'icons_generalinfo': '<:icons_generalinfo:866599434098835486>',
		'icons_growth': '<:icons_growth:866605190396510238>',
		'icons_linkadd': '<:icons_linkadd:865572290065072128>',
		'icons_linkrevoke': '<:icons_linkrevoke:865572289022394368>',
		'icons_linkupdate': '<:icons_linkupdate:865572289180205057>',
		'icons_markasread': '<:icons_markasread:866599434100015115>',
		'icons_notificationsettings': '<:icons_notificationsettings:866599434251010089>',
		'icons_OAuth2': '<:icons_OAuth2:866599434729029642>',
		'icons_roles': '<:icons_roles:866605189029298197>',
		'icons_scheduleevent': '<:icons_scheduleevent:866943416021811200>',
		'icons_serverinsight': '<:icons_serverinsight:866599433901572096>',
		'icons_startstage': '<:icons_startstage:866943414699032577>',
		'icons_swardx': '<:icons_swardx:866599435214389258>',
		'icons_threadchannel': '<:icons_threadchannel:866694823972438056>',
		'icons_unbanmember': '<:icons_unbanmember:866943415321100289>',
		'icons_updatechannel': '<:icons_updatechannel:866943415450599437>',
		'icons_updateemoji': '<:icons_updateemoji:866943416343461891>',
		'icons_updateevent': '<:icons_updateevent:866943415614046266>',
		'icons_updateintegration': '<:icons_updateintegration:866943415891263518>',
		'icons_updatemember': '<:icons_updatemember:866943416256167936>',
		'icons_updaterole': '<:icons_updaterole:866943415278895114>',
		'icons_updateserver': '<:icons_updateserver:866943416158781451>',
		'icons_updatestage': '<:icons_updatestage:866943415447191592> ',
		'icons_updatesticker': '<:icons_updatesticker:866943415560175697>',
		'icons_updatethread': '<:icons_updatethread:866943415136026674>',
		'icons_updatewebhook': '<:icons_updatewebhook:866943415384277002>',
		'icons_0': '<:icons_0:866997284961386496>',
		'icons_1': '<:icons_1:866951385148293170>',
		'icons_10': '<:icons_10:866951386159906816>',
		'icons_2': '<:icons_2:866951385416859668>',
		'icons_3': '<:icons_3:866951386187825182>',
		'icons_4': '<:icons_4:866951385114476565>',
		'icons_5': '<:icons_5:866951385664978984>',
		'icons_6': '<:icons_6:866951386372505600>',
		'icons_7': '<:icons_7:866951385542950943>',
		'icons_8': '<:icons_8:866951385765773323>',
		'icons_9': '<:icons_9:866951385164283934>',
		'icons_a': '<:icons_a:866997309723639818>',
		'icons_amogus': '<:icons_amogus:867651538448809984>',
		'icons_b': '<:icons_b:866997309383901184>',
		'icons_bday': '<:icons_bday:868022351873318972>',
		'icons_book': '<:icons_book:867656825545424898>',
		'icons_c': '<:icons_c:866997309552197662>',
		'icons_d': '<:icons_d:866997309052944385>',
		'icons_e': '<:icons_e:866997309325312030>',
		'icons_f': '<:icons_f:866997309211541515>',
		'icons_fingerprint': '<:icons_fingerprint:867656826899136553>',
		'icons_g': '<:icons_g:866997309429383169>',
		'icons_Guardian': '<:Icons_Guardian:867400863822512148>',
		'icons_h': '<:icons_h:866997309601611786>',
		'icons_he_him': '<:icons_he_him:868025274745372673>',
		'icons_i': '<:icons_i:866997309576314901>',
		'icons_j': '<:icons_j:866997309472636969>',
		'icons_k': '<:icons_k:866997309685497856>',
		'icons_l': '<:icons_l:866997309802676244>',
		'icons_library': '<:icons_library:867022827035164692>',
		'icons_m': '<:icons_m:866997310197727263>',
		'icons_n': '<:icons_n:866997309334093844>',
		'icons_o': '<:icons_o:866997310378606652>',
		'icons_p': '<:icons_p:866997310332207134>',
		'icons_q': '<:icons_q:866997309489152030>',
		'icons_r': '<:icons_r:866997309447208970>',
		'icons_s': '<:icons_s:866997310364581918>',
		'icons_she_her': '<:icons_she_her:868025274799898666>',
		'icons_statsdown': '<:icons_statsdown:867656825478184990>',
		'icons_t': '<:icons_t:866997309828235284>',
		'icons_tada': '<:icons_tada:868022351508414474>',
		'icons_they_them': '<:icons_they_them:868025379233882163>',
		'icons_translate': '<:icons_translate:867656825527730176>',
		'icons_u': '<:icons_u:866997309678026754>',
		'icons_v': '<:icons_v:866997310599987210>',
		'icons_vpn': '<:icons_vpn:867656825346981899>',
		'icons_w': '<:icons_w:866997310365499393>',
		'icons_x': '<:icons_x:866997309798481920>',
		'icons_y': '<:icons_y:866997309737140234>',
		'icons_z': '<:icons_z:866997309521657886>',
		'icons_18': '<:icons_18:908958944125386762>',
		'icons_bigender': '<:icons_bigender:886586235278221323>',
		'icons_calender': '<:icons_calender:886913968331976744>',
		'icons_calenderdate': '<:icons_calenderdate:886913968566833152>',
		'icons_cmd': '<:icons_cmd:886913968386490368>',
		'icons_discordjs': '<:icons_discordjs:891686633991192607>',
		'icons_Female': '<:icons_Female:886586235567624243>',
		'icons_gay': '<:icons_gay:886586235399856129>',
		'icons_gender': '<:icons_gender:908959006796681216>',
		'icons_hetero': '<:icons_hetero:886586234577768518>',
		'icons_jpg': '<:icons_jpg:908958943726956564>',
		'icons_js': '<:icons_js:891686633869545503>',
		'icons_lesbian': '<:icons_lesbian:886586235840233543>',
		'icons_Male': '<:icons_Male:886586234883932181>',
		'icons_moderationhig': '<:icons_moderationhig:892004694535327814>',
		'icons_moderationhighest': '<:icons_moderationhighest:892004694120103946>',
		'icons_moderationlow': '<:icons_moderationlow:892004694157848616>',
		'icons_moderationmedium': '<:icons_moderationmedium:892004694887653416>',
		'icons_moderationnone': '<:icons_moderationnone:892004693943926785>',
		'icons_nodejs': '<:icons_nodejs:891686636625223680>',
		'icons_png': '<:icons_png:908958943454302219>',
		'icons_radmins': '<:Icons_radmins:888881202382118922>',
		'icons_rartists': '<:Icons_rartists:889125916624683088>',
		'icons_rboosters': '<:Icons_rboosters:888881202256306237>',
		'icons_rbots': '<:Icons_rbots:888881202797375548>',
		'icons_rcamera': '<:Icons_rcamera:889125916658253854>',
		'icons_rdevelopers': '<:Icons_rdevelopers:889125916922511420>',
		'icons_revents': '<:Icons_revents:888881202835107850>',
		'icons_rfire': '<:Icons_rfire:889125916956033024>',
		'icons_rguardians': '<:Icons_rguardians:888881201128013867>',
		'icons_rhelpers': '<:Icons_rhelpers:888881202369552474>',
		'icons_rmembers': '<:Icons_rmembers:888881202377949214>',
		'icons_rmods': '<:Icons_rmods:888881201354514522>',
		'icons_rowner': '<:Icons_rowner:888881202352754688>',
		'icons_rpodcast': '<:Icons_rpodcast:889125916494688276>',
		'icons_rsdonator': '<:Icons_rsdonator:889125916377227274>',
		'icons_rspartner': '<:Icons_rspartner:889125916851191808>',
		'icons_rsstaffs': '<:Icons_rsstaffs:889125916041691177>',
		'icons_rstaff': '<:Icons_rstaff:888881202877067275>',
		'icons_rverification': '<:Icons_rverification:889125916700201031>',
		'icons_rverified': '<:Icons_rverified:888881202700894218>',
		'icons_rVIP': '<:Icons_rVIP:888881201199329311>',
		'icons_snowflake': '<:icons_snowflake:909680178437976114>',
		'icons_tiktok': '<:Icons_tiktok:941672576449654804>',
		'icons_transgender': '<:icons_transgender:886586234800078889>',
		'icons_twitch': '<:icons_twitch:908592812046573588>',
		'icons_vklogo': '<:Icons_vklogo:938087795065520199>',
		'icons_warning': '<:icons_warning:908958943466893323>',
		'icons_wave': '<:icons_wave:908959006725378048>',
		'icons_webp': '<:icons_webp:908958943550779413>',
	},
};

/* ----------------------------------- Util ----------------------------------- */

function getPropertyByPath(object: Record<string, Record<string, string>>, path: string): string {
	let value: Record<string, Record<string, string>> | Record<string, string> | string = object;

	for (const key of path.split('.')) {
		if (!Object.prototype.hasOwnProperty.call(value, key)) return '';
		value = value[key];
	}

	return value as unknown as string;
}

export function getEmojiCheck<T extends boolean>(path: string, format: T, perms: boolean): (T extends true ? APIMessageComponentEmoji : string) {
	type Internal = T extends true ? APIMessageComponentEmoji : string;

	if (!perms) return (format ? { name: undefined, id: undefined } : '') as unknown as Internal;
	const emoji = getPropertyByPath(Emojis, path);

	if (!format) return emoji as unknown as Internal;
	else return {
		id: emoji.split(':')[2].replace('>', ''),
		name: emoji.split(':')[1],
	} as unknown as Internal;
}

export default Emojis;
