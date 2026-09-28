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
};

const meal = (time: "Trưa" | "Tối", key: keyof typeof DISH): BoxMeal => ({ time, ...DISH[key] });
const day = (n: number, lunch: keyof typeof DISH, dinner: keyof typeof DISH): BoxMealDay => ({ day: n, meals: [meal("Trưa", lunch), meal("Tối", dinner)] });

/** Leafy greens first, roots and squash last. Two meals a day. */
export const MENU_S: BoxMealDay[] = [
  day(1, "cai_ngot_xao_toi", "canh_ca_chua_trung"),
  day(2, "su_su_xao_toi", "bap_cai_luoc_cham_trung"),
  day(3, "bap_cai_xao_ca_chua", "canh_bap_cai_ca_rot"),
];
export const MENU_M: BoxMealDay[] = [
  day(1, "canh_cai_meo_thit_bam", "bap_cai_xao_ca_chua"),
  day(2, "ca_rot_su_hao_xao_thit", "canh_ca_chua_trung"),
  day(3, "canh_bi_do_thit_bam", "bap_cai_luoc_cham_trung"),
  day(4, "khoai_tay_ham_ca_rot", "bi_do_xao_toi"),
];
export const MENU_L: BoxMealDay[] = [
  day(1, "cai_ngot_xao_toi", "canh_cai_meo_thit_bam"),
  day(2, "su_su_xao_toi", "canh_ca_chua_trung"),
  day(3, "ca_rot_su_hao_xao_thit", "canh_bap_cai_ca_rot"),
  day(4, "canh_bi_do_thit_bam", "nom_su_hao_ca_rot"),
  day(5, "khoai_tay_ham_ca_rot", "bi_do_xao_toi"),
];
