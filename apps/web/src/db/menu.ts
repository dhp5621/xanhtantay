import type { BoxMeal, BoxMealDay } from "./schema";

/** Dish library for the box menus. Every dish is built on produce that is actually in the boxes. */
const DISH: Record<string, Omit<BoxMeal, "time">> = {
  cai_ngot_xao_toi: {
    title: "Cải ngọt xào tỏi", uses: ["Cải ngọt"], note: "Rau lá ăn trước cho tươi.",
    recipe: { minutes: 10, ingredients: ["300 g cải ngọt", "3 tép tỏi", "1 thìa dầu ăn", "1 thìa nước mắm", "chút hạt nêm"], steps: ["Cải ngọt nhặt bỏ lá già, rửa sạch, cắt khúc 5 cm, để ráo.", "Tỏi đập dập, băm nhỏ.", "Phi thơm tỏi với dầu trên lửa lớn.", "Cho phần cuống vào đảo 1 phút rồi mới cho lá.", "Nêm nước mắm, hạt nêm, đảo nhanh tay tới khi rau vừa chín tới thì tắt bếp."] },
  },
  canh_ca_chua_trung: {
    title: "Canh cà chua trứng", uses: ["Cà chua"],
    recipe: { minutes: 15, ingredients: ["250 g cà chua", "2 quả trứng", "1 củ hành khô", "hành lá", "1 thìa nước mắm", "600 ml nước"], steps: ["Cà chua rửa sạch, bổ múi cau.", "Phi thơm hành khô, cho cà chua vào xào mềm với chút muối.", "Đổ nước, đun sôi 3 phút.", "Trứng đánh tan, rót từ từ vào nồi, khuấy nhẹ một chiều.", "Nêm nước mắm vừa ăn, rắc hành lá rồi tắt bếp."] },
  },
  su_su_xao_toi: {
    title: "Su su xào tỏi", uses: ["Su su"],
    recipe: { minutes: 15, ingredients: ["400 g su su", "4 tép tỏi", "1 thìa dầu ăn", "1 thìa nước mắm", "tiêu"], steps: ["Su su gọt vỏ dưới vòi nước cho đỡ nhựa, bỏ hạt, thái que.", "Phi thơm một nửa tỏi với dầu.", "Cho su su vào xào lửa lớn, thêm 2 thìa nước cho nhanh chín.", "Nêm nước mắm, đảo tới khi su su trong và giòn.", "Cho nốt tỏi sống, rắc tiêu, tắt bếp."] },
  },
  bap_cai_luoc_cham_trung: {
    title: "Bắp cải luộc chấm trứng", uses: ["Bắp cải"], note: "Nước luộc để làm canh, vắt thêm chút chanh.",
    recipe: { minutes: 15, ingredients: ["500 g bắp cải", "2 quả trứng luộc", "3 thìa nước mắm", "chút muối"], steps: ["Bắp cải tách lá, rửa sạch, thái miếng vừa ăn.", "Đun sôi nước với chút muối.", "Cho bắp cải vào luộc 3–4 phút, vớt ra khi còn xanh.", "Trứng luộc dầm nát với nước mắm.", "Dọn bắp cải chấm mắm trứng, nước luộc làm canh."] },
  },
  bap_cai_xao_ca_chua: {
    title: "Bắp cải xào cà chua", uses: ["Bắp cải", "Cà chua"],
    recipe: { minutes: 15, ingredients: ["400 g bắp cải", "150 g cà chua", "2 tép tỏi", "1 thìa dầu ăn", "1 thìa nước mắm", "hành lá"], steps: ["Bắp cải thái sợi to, cà chua bổ múi.", "Phi thơm tỏi, cho cà chua vào xào mềm.", "Cho bắp cải vào đảo lửa lớn 3–4 phút.", "Nêm nước mắm, hạt nêm vừa ăn.", "Rắc hành lá, tắt bếp khi bắp cải còn giòn."] },
  },
  canh_bap_cai_ca_rot: {
    title: "Canh bắp cải cà rốt thịt băm", uses: ["Bắp cải", "Cà rốt"],
    recipe: { minutes: 20, ingredients: ["300 g bắp cải", "150 g cà rốt", "100 g thịt băm", "1 củ hành khô", "1 thìa nước mắm", "800 ml nước"], steps: ["Cà rốt gọt vỏ thái lát mỏng, bắp cải thái miếng.", "Phi thơm hành khô, xào thịt băm săn lại.", "Đổ nước, cho cà rốt vào nấu 5 phút.", "Cho bắp cải vào nấu thêm 3 phút.", "Nêm nước mắm vừa ăn, tắt bếp."] },
  },
  canh_cai_meo_thit_bam: {
    title: "Canh cải mèo nấu thịt băm", uses: ["Cải mèo"], note: "Cải mèo hơi đắng nhẹ, hậu ngọt; ăn ngay trong hai ngày đầu.",
    recipe: { minutes: 15, ingredients: ["300 g cải mèo", "100 g thịt băm", "1 nhánh gừng nhỏ", "1 thìa nước mắm", "700 ml nước"], steps: ["Cải mèo rửa sạch, vò nhẹ, cắt khúc.", "Thịt băm ướp chút nước mắm, tiêu.", "Đun sôi nước với gừng đập dập, thả thịt băm vào khuấy tan.", "Hớt bọt, cho cải mèo vào, mở vung cho rau xanh.", "Sôi lại là nêm vừa ăn và tắt bếp ngay."] },
  },
  ca_rot_su_hao_xao_thit: {
    title: "Cà rốt su hào xào thịt", uses: ["Cà rốt", "Su hào"],
    recipe: { minutes: 20, ingredients: ["200 g cà rốt", "250 g su hào", "150 g thịt lợn thái mỏng", "3 tép tỏi", "1 thìa dầu hào", "hành lá"], steps: ["Cà rốt, su hào gọt vỏ, thái que đều tay.", "Thịt ướp chút nước mắm, tiêu 10 phút.", "Phi tỏi, xào thịt vừa chín rồi trút ra.", "Xào cà rốt trước 2 phút, thêm su hào và 2 thìa nước.", "Cho thịt vào lại, nêm dầu hào, rắc hành lá."] },
  },
  canh_bi_do_thit_bam: {
    title: "Canh bí đỏ thịt băm", uses: ["Bí đỏ"],
    recipe: { minutes: 25, ingredients: ["400 g bí đỏ", "100 g thịt băm", "1 củ hành khô", "hành lá, mùi tàu", "1 thìa nước mắm", "800 ml nước"], steps: ["Bí đỏ gọt vỏ, bỏ ruột, cắt miếng vuông.", "Phi thơm hành khô, xào thịt băm cho săn.", "Cho bí vào đảo 1 phút rồi đổ nước.", "Nấu lửa vừa 12–15 phút tới khi bí mềm.", "Nêm nước mắm, rắc hành lá và mùi tàu."] },
  },
  bi_do_xao_toi: {
    title: "Bí đỏ xào tỏi", uses: ["Bí đỏ"],
    recipe: { minutes: 15, ingredients: ["400 g bí đỏ", "5 tép tỏi", "1 thìa dầu ăn", "1 thìa nước mắm", "chút đường"], steps: ["Bí đỏ gọt vỏ, thái lát mỏng vừa.", "Phi thơm tỏi đập dập.", "Cho bí vào xào lửa lớn, thêm 3 thìa nước.", "Đậy vung 3 phút cho bí chín mềm mà không nát.", "Nêm nước mắm, chút đường, đảo đều rồi tắt bếp."] },
  },
  khoai_tay_ham_ca_rot: {
    title: "Khoai tây hầm cà rốt với sườn", uses: ["Khoai tây", "Cà rốt"], note: "Củ để được lâu nên xếp vào cuối tuần.",
    recipe: { minutes: 40, ingredients: ["300 g khoai tây", "200 g cà rốt", "300 g sườn non", "1 củ hành tây", "1 thìa nước mắm", "1 lít nước"], steps: ["Sườn chần nước sôi, rửa sạch.", "Khoai tây, cà rốt gọt vỏ, cắt khúc to.", "Hầm sườn với hành tây 20 phút.", "Cho cà rốt vào trước, 5 phút sau cho khoai tây.", "Hầm thêm 10 phút tới khi củ mềm, nêm vừa ăn."] },
  },
  khoai_tay_xao_ca_chua: {
    title: "Khoai tây xào cà chua", uses: ["Khoai tây", "Cà chua"],
    recipe: { minutes: 20, ingredients: ["350 g khoai tây", "150 g cà chua", "2 tép tỏi", "1 thìa dầu ăn", "hành lá", "1 thìa nước mắm"], steps: ["Khoai tây gọt vỏ, thái que, ngâm nước muối loãng 5 phút rồi để ráo.", "Phi thơm tỏi, xào cà chua thành sốt.", "Cho khoai vào đảo đều, thêm 4 thìa nước.", "Đậy vung 5 phút cho khoai chín.", "Nêm nước mắm, rắc hành lá."] },
  },
  nom_su_hao_ca_rot: {
    title: "Nộm su hào cà rốt", uses: ["Su hào", "Cà rốt"],
    recipe: { minutes: 20, ingredients: ["300 g su hào", "100 g cà rốt", "2 thìa lạc rang", "2 thìa nước mắm", "2 thìa đường", "1 quả chanh", "tỏi, ớt, rau thơm"], steps: ["Su hào, cà rốt gọt vỏ, nạo sợi.", "Bóp với chút muối 5 phút rồi vắt ráo.", "Pha nước trộn: nước mắm, đường, chanh, tỏi ớt băm.", "Trộn đều, để ngấm 10 phút.", "Rắc lạc rang giã dối và rau thơm khi ăn."] },
  },
  canh_su_su_tom: {
    title: "Canh su su nấu tôm", uses: ["Su su"],
    recipe: { minutes: 20, ingredients: ["300 g su su", "100 g tôm", "1 củ hành khô", "hành lá", "1 thìa nước mắm", "700 ml nước"], steps: ["Su su gọt vỏ, thái lát mỏng.", "Tôm bóc vỏ, giã dập, ướp chút nước mắm.", "Phi hành, xào tôm thơm rồi đổ nước.", "Nước sôi cho su su vào nấu 5 phút.", "Nêm vừa ăn, rắc hành lá."] },
  },
  cai_meo_luoc: {
    title: "Cải mèo luộc chấm mắm tỏi", uses: ["Cải mèo"],
    recipe: { minutes: 10, ingredients: ["300 g cải mèo", "2 thìa nước mắm", "2 tép tỏi", "1 quả ớt", "nửa quả chanh"], steps: ["Cải mèo rửa sạch, để nguyên cây nhỏ hoặc cắt đôi.", "Đun nước sôi bùng với chút muối.", "Luộc rau 2 phút, mở vung.", "Vớt ra rổ cho ráo.", "Pha mắm tỏi ớt chanh để chấm."] },
  },
  canh_cai_ngot_thit_bam: {
    title: "Canh cải ngọt thịt băm", uses: ["Cải ngọt"],
    recipe: { minutes: 15, ingredients: ["250 g cải ngọt", "100 g thịt băm", "1 nhánh gừng", "1 thìa nước mắm", "700 ml nước"], steps: ["Cải ngọt rửa sạch, cắt khúc.", "Đun sôi nước với gừng, thả thịt băm.", "Hớt bọt cho nước trong.", "Cho cải ngọt vào, mở vung.", "Sôi lại nêm nước mắm rồi tắt bếp."] },
  },
  dau_phu_sot_ca_chua: {
    title: "Đậu phụ sốt cà chua", uses: ["Cà chua"],
    recipe: { minutes: 20, ingredients: ["3 bìa đậu phụ", "300 g cà chua", "1 củ hành khô", "hành lá", "1 thìa nước mắm", "dầu ăn"], steps: ["Đậu phụ cắt miếng vuông, rán vàng đều các mặt.", "Cà chua thái hạt lựu.", "Phi thơm hành khô, xào cà chua với chút muối tới khi nhuyễn thành sốt.", "Thêm nửa bát nước, cho đậu vào om lửa nhỏ 5 phút.", "Nêm nước mắm, rắc hành lá rồi tắt bếp."] },
  },
  trung_sot_ca_chua: {
    title: "Trứng sốt cà chua", uses: ["Cà chua"], note: "Cà chua chín dần trong tuần, càng về sau sốt càng đậm.",
    recipe: { minutes: 15, ingredients: ["3 quả trứng", "250 g cà chua", "1 củ hành khô", "hành lá", "1 thìa nước mắm", "chút đường"], steps: ["Trứng đánh tan với chút nước mắm.", "Rán trứng chín tới, dùng đũa xắn miếng to rồi trút ra.", "Phi hành khô, xào cà chua thái múi với chút đường cho ra sốt.", "Cho trứng vào lại, đảo nhẹ cho thấm sốt.", "Rắc hành lá, tắt bếp."] },
  },
  ca_rot_xao_trung: {
    title: "Cà rốt xào trứng", uses: ["Cà rốt"],
    recipe: { minutes: 15, ingredients: ["300 g cà rốt", "2 quả trứng", "2 tép tỏi", "hành lá", "1 thìa nước mắm", "dầu ăn"], steps: ["Cà rốt gọt vỏ, nạo sợi.", "Phi thơm tỏi, cho cà rốt vào xào 3 phút với chút muối.", "Gạt cà rốt sang một bên, đập trứng vào khuấy tơi.", "Trộn đều trứng với cà rốt, nêm nước mắm.", "Rắc hành lá, tắt bếp."] },
  },
  sup_lo_xao_toi: {
    title: "Súp lơ xanh xào tỏi", uses: ["Súp lơ xanh"],
    recipe: { minutes: 15, ingredients: ["400 g súp lơ xanh", "5 tép tỏi", "1 thìa dầu hào", "1 thìa dầu ăn", "chút muối"], steps: ["Súp lơ tách nhánh nhỏ, ngâm nước muối loãng 5 phút, rửa lại.", "Chần nước sôi 1 phút rồi thả vào nước lạnh cho xanh giòn.", "Phi thơm tỏi băm.", "Cho súp lơ vào xào lửa lớn 2 phút.", "Nêm dầu hào, đảo đều rồi tắt bếp."] },
  },
  sup_lo_luoc: {
    title: "Súp lơ xanh luộc chấm muối vừng", uses: ["Súp lơ xanh"],
    recipe: { minutes: 10, ingredients: ["400 g súp lơ xanh", "2 thìa vừng rang", "1 thìa lạc rang", "chút muối"], steps: ["Súp lơ tách nhánh, gọt vỏ phần cuống rồi thái lát.", "Đun nước sôi với chút muối.", "Luộc cuống trước 1 phút, thêm phần hoa luộc 2 phút nữa.", "Vớt ra để ráo.", "Giã vừng, lạc với muối để chấm."] },
  },
  dau_co_ve_xao_toi: {
    title: "Đậu cô ve xào tỏi", uses: ["Đậu cô ve"],
    recipe: { minutes: 15, ingredients: ["350 g đậu cô ve", "4 tép tỏi", "1 thìa dầu ăn", "1 thìa nước mắm", "chút hạt nêm"], steps: ["Đậu tước xơ hai bên, bẻ đôi hoặc thái vát.", "Chần nước sôi 2 phút, vớt ra để ráo.", "Phi thơm tỏi đập dập.", "Cho đậu vào xào lửa lớn 3 phút.", "Nêm nước mắm, hạt nêm rồi tắt bếp khi đậu còn giòn."] },
  },
  dau_co_ve_xao_thit_bo: {
    title: "Đậu cô ve xào thịt bò", uses: ["Đậu cô ve"],
    recipe: { minutes: 20, ingredients: ["300 g đậu cô ve", "150 g thịt bò thái mỏng", "4 tép tỏi", "1 thìa dầu hào", "1 thìa nước mắm", "tiêu"], steps: ["Thịt bò ướp tỏi băm, dầu hào, tiêu 10 phút.", "Đậu tước xơ, thái vát, chần sơ nước sôi.", "Xào thịt bò lửa thật lớn cho tái rồi trút ra.", "Xào đậu 3 phút, nêm nước mắm.", "Cho thịt bò vào lại, đảo nhanh rồi tắt bếp."] },
  },
  bap_cai_cuon_thit: {
    title: "Bắp cải cuộn thịt", uses: ["Bắp cải"], note: "Bắp cải để được cả tuần trong ngăn mát.",
    recipe: { minutes: 35, ingredients: ["8 lá bắp cải to", "250 g thịt băm", "2 tai mộc nhĩ", "1 củ hành khô", "hành lá chần", "1 thìa nước mắm", "tiêu"], steps: ["Lá bắp cải chần nước sôi cho mềm, lạng bớt phần sống lá.", "Trộn thịt băm với mộc nhĩ thái nhỏ, hành khô, nước mắm, tiêu.", "Đặt nhân vào lá bắp cải, gấp hai mép rồi cuộn chặt tay.", "Buộc bằng hành lá chần, xếp vào xửng.", "Hấp 15 phút, ăn kèm nước mắm pha."] },
  },
  canh_cu_cai_suon: {
    title: "Canh củ cải hầm sườn", uses: ["Củ cải trắng"],
    recipe: { minutes: 40, ingredients: ["400 g củ cải trắng", "300 g sườn non", "1 củ hành khô", "hành lá, mùi tàu", "1 thìa nước mắm", "1 lít nước"], steps: ["Sườn chần nước sôi, rửa sạch.", "Củ cải gọt vỏ, cắt khúc 3 cm.", "Hầm sườn với hành khô nướng 20 phút, hớt bọt.", "Cho củ cải vào hầm thêm 12 phút tới khi trong và mềm.", "Nêm nước mắm, rắc hành lá và mùi tàu."] },
  },
  cu_cai_kho_thit: {
    title: "Củ cải kho thịt ba chỉ", uses: ["Củ cải trắng"],
    recipe: { minutes: 35, ingredients: ["400 g củ cải trắng", "250 g thịt ba chỉ", "2 thìa nước mắm", "1 thìa đường", "1 củ hành khô", "tiêu"], steps: ["Thịt ba chỉ thái miếng vừa ăn, ướp nước mắm, hành khô, tiêu 15 phút.", "Củ cải gọt vỏ, cắt miếng con chì.", "Thắng đường lấy màu cánh gián, cho thịt vào đảo săn.", "Thêm củ cải và nước xâm xấp mặt.", "Kho lửa nhỏ 20 phút tới khi nước sánh lại."] },
  },
  canh_su_hao_suon: {
    title: "Canh su hào nấu sườn", uses: ["Su hào"],
    recipe: { minutes: 35, ingredients: ["350 g su hào", "300 g sườn non", "1 củ hành khô", "hành lá", "1 thìa nước mắm", "1 lít nước"], steps: ["Sườn chần nước sôi, rửa sạch.", "Su hào gọt vỏ, thái miếng con chì.", "Ninh sườn với hành khô 20 phút.", "Cho su hào vào nấu thêm 10 phút.", "Nêm nước mắm, rắc hành lá rồi tắt bếp."] },
  },
  sup_bi_do: {
    title: "Súp bí đỏ", uses: ["Bí đỏ"], note: "Bí đỏ để nơi thoáng mát được hơn hai tuần.",
    recipe: { minutes: 30, ingredients: ["500 g bí đỏ", "1 củ hành tây nhỏ", "200 ml sữa tươi không đường", "1 thìa bơ", "chút muối, tiêu", "400 ml nước"], steps: ["Bí đỏ gọt vỏ, bỏ ruột, cắt miếng nhỏ.", "Phi hành tây thái nhỏ với bơ cho thơm.", "Cho bí vào đảo 2 phút, thêm nước, nấu 15 phút tới khi bí mềm.", "Xay nhuyễn, đổ lại vào nồi cùng sữa tươi.", "Đun nóng lại, nêm muối, rắc tiêu khi ăn."] },
  },
};

const meal = (time: "Trưa" | "Tối", key: keyof typeof DISH): BoxMeal => ({ time, ...DISH[key] });
const day = (n: number, lunch: keyof typeof DISH, dinner: keyof typeof DISH): BoxMealDay => ({ day: n, meals: [meal("Trưa", lunch), meal("Tối", dinner)] });

/**
 * One menu per mix, shared by its three sizes: 7 days, two meals a day.
 * Leafy greens come first, roots and squash last, so the box lasts the whole week.
 */
export const MENU_ME_GUI: BoxMealDay[] = [
  day(1, "cai_ngot_xao_toi", "canh_ca_chua_trung"),
  day(2, "canh_cai_ngot_thit_bam", "su_su_xao_toi"),
  day(3, "bap_cai_luoc_cham_trung", "dau_phu_sot_ca_chua"),
  day(4, "canh_su_su_tom", "bap_cai_xao_ca_chua"),
  day(5, "canh_bap_cai_ca_rot", "bi_do_xao_toi"),
  day(6, "khoai_tay_xao_ca_chua", "canh_bi_do_thit_bam"),
  day(7, "khoai_tay_ham_ca_rot", "ca_rot_xao_trung"),
];
export const MENU_VUNG_CAO: BoxMealDay[] = [
  day(1, "canh_cai_meo_thit_bam", "cai_ngot_xao_toi"),
  day(2, "cai_meo_luoc", "canh_cai_ngot_thit_bam"),
  day(3, "sup_lo_xao_toi", "canh_ca_chua_trung"),
  day(4, "dau_co_ve_xao_toi", "sup_lo_luoc"),
  day(5, "dau_co_ve_xao_thit_bo", "bap_cai_luoc_cham_trung"),
  day(6, "su_su_xao_toi", "bap_cai_xao_ca_chua"),
  day(7, "canh_su_su_tom", "bap_cai_cuon_thit"),
];
export const MENU_CU_QUA: BoxMealDay[] = [
  day(1, "bap_cai_xao_ca_chua", "canh_cu_cai_suon"),
  day(2, "ca_rot_su_hao_xao_thit", "canh_bap_cai_ca_rot"),
  day(3, "nom_su_hao_ca_rot", "canh_bi_do_thit_bam"),
  day(4, "cu_cai_kho_thit", "canh_su_hao_suon"),
  day(5, "khoai_tay_xao_ca_chua", "bi_do_xao_toi"),
  day(6, "sup_bi_do", "ca_rot_xao_trung"),
  day(7, "khoai_tay_ham_ca_rot", "trung_sot_ca_chua"),
];
