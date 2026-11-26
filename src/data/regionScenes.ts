import { REGIONAL_PROFILES } from './vocabulary';
import { RegionId, VocabularyStageId } from '../types';

export interface LandmarkItem {
  id: string;
  name: string;
  /**
   * Đường dẫn ảnh địa danh đặt tại `public/assets/landmarks/`.
   * Hiện sử dụng SVG phẳng tông ấm; có thể thay thế trực tiếp bằng file PNG/WebP/SVG thật cùng tên.
   */
  src: string;
  position: 'left' | 'right';
  depth: 'far' | 'near';
  /** Vị trí theo trục dọc (%) bên trong khối vùng miền (chỉ áp dụng ở màn hình >= 640px). */
  topPercent: number;
  /** Thời lượng chu kỳ nổi nhẹ (giây). */
  floatDuration: number;
  /** Hiển thị ở bản rút gọn mobile (< 640px) - tối đa 2 địa danh/vùng. */
  mobileVisible: boolean;
}

export interface RegionSceneConfig {
  id: RegionId;
  shortName: string;
  title: string;
  description: string;
  toneCharacteristics: string;
  /** Lớp phủ chuyển sắc rất nhẹ (<= 15%, họ cam/vàng/đỏ) giữ nguyên nền practice-bg.jpg. */
  accentOverlayClass: string;
  /** Màu nhấn viền/badge cho vùng. */
  badgeGradientClass: string;
  /** Nhân vật Bé Lạc đi kèm địa danh đầu tiên của vùng. */
  mascotSrc: string;
  mascotCaption: string;
  /** Chặng mặc định gợi ý khi vào vùng (vẫn giữ nút chuyển 3 chặng bên trong). */
  recommendedStage: VocabularyStageId;
  /** Chữ hiển thị ở điểm chuyển vùng phía trên (nếu có). */
  dividerTitle?: string;
  dividerSubtitle?: string;
  landmarks: LandmarkItem[];
}

const profileMap = Object.fromEntries(
  REGIONAL_PROFILES.map((p) => [p.id, p])
) as Record<RegionId, (typeof REGIONAL_PROFILES)[number]>;

export const REGION_SCENES: RegionSceneConfig[] = [
  {
    id: 'bac',
    shortName: profileMap.bac.shortName,
    title: profileMap.bac.name,
    description: profileMap.bac.description,
    toneCharacteristics: profileMap.bac.toneCharacteristics,
    // Bắc: cam pha vàng nhạt (<= 15%)
    accentOverlayClass:
      'bg-gradient-to-b from-amber-300/15 via-orange-400/10 to-transparent mix-blend-soft-light',
    badgeGradientClass: 'from-amber-500/85 to-orange-500/90',
    mascotSrc: '/assets/be-lac.png',
    mascotCaption: 'Bé Lạc xuất phát tại Hà Nội!',
    recommendedStage: 'stage1_ma',
    landmarks: [
      {
        id: 'van-mieu',
        name: 'Văn Miếu – Quốc Tử Giám',
        src: '/assets/landmarks/van-mieu.svg',
        position: 'left',
        depth: 'near',
        topPercent: 18,
        floatDuration: 4.4,
        mobileVisible: true,
      },
      {
        id: 'chua-mot-cot',
        name: 'Chùa Một Cột',
        src: '/assets/landmarks/chua-mot-cot.svg',
        position: 'right',
        depth: 'far',
        topPercent: 31,
        floatDuration: 5.2,
        mobileVisible: false,
      },
      {
        id: 'vinh-ha-long',
        name: 'Vịnh Hạ Long',
        src: '/assets/landmarks/vinh-ha-long.svg',
        position: 'left',
        depth: 'far',
        topPercent: 52,
        floatDuration: 5.6,
        mobileVisible: true,
      },
      {
        id: 'sapa-terrace',
        name: 'Ruộng bậc thang Sa Pa',
        src: '/assets/landmarks/sapa-terrace.svg',
        position: 'right',
        depth: 'near',
        topPercent: 66,
        floatDuration: 4.8,
        mobileVisible: false,
      },
      {
        id: 'ho-guom',
        name: 'Hồ Gươm – Tháp Rùa',
        src: '/assets/landmarks/ho-guom.svg',
        position: 'left',
        depth: 'near',
        topPercent: 82,
        floatDuration: 4.2,
        mobileVisible: false,
      },
    ],
  },
  {
    id: 'trung',
    shortName: profileMap.trung.shortName,
    title: profileMap.trung.name,
    description: profileMap.trung.description,
    toneCharacteristics: profileMap.trung.toneCharacteristics,
    // Trung: cam đậm hơn (<= 15%)
    accentOverlayClass:
      'bg-gradient-to-b from-orange-600/15 via-amber-700/12 to-transparent mix-blend-soft-light',
    badgeGradientClass: 'from-orange-600/90 to-amber-600/90',
    mascotSrc: '/assets/be-lac-cool.png',
    mascotCaption: 'Bé Lạc ghé thăm miền Trung!',
    recommendedStage: 'stage2_syllables',
    dividerTitle: 'Bạn đang đi vào Miền Trung',
    dividerSubtitle: 'Lắng nghe âm vực trầm ấm qua cố đô Huế và phố cổ Hội An',
    landmarks: [
      {
        id: 'co-do-hue',
        name: 'Cố đô Huế (Ngọ Môn)',
        src: '/assets/landmarks/co-do-hue.svg',
        position: 'left',
        depth: 'near',
        topPercent: 18,
        floatDuration: 4.6,
        mobileVisible: true,
      },
      {
        id: 'hoi-an',
        name: 'Chùa Cầu – Phố cổ Hội An',
        src: '/assets/landmarks/hoi-an.svg',
        position: 'right',
        depth: 'near',
        topPercent: 32,
        floatDuration: 4.2,
        mobileVisible: true,
      },
      {
        id: 'cau-rong',
        name: 'Cầu Rồng Đà Nẵng',
        src: '/assets/landmarks/cau-rong.svg',
        position: 'left',
        depth: 'far',
        topPercent: 52,
        floatDuration: 5.5,
        mobileVisible: false,
      },
      {
        id: 'cau-vang',
        name: 'Bà Nà Hills – Cầu Vàng',
        src: '/assets/landmarks/cau-vang.svg',
        position: 'right',
        depth: 'far',
        topPercent: 67,
        floatDuration: 5.8,
        mobileVisible: false,
      },
      {
        id: 'phong-nha',
        name: 'Động Phong Nha',
        src: '/assets/landmarks/phong-nha.svg',
        position: 'left',
        depth: 'near',
        topPercent: 83,
        floatDuration: 4.9,
        mobileVisible: false,
      },
    ],
  },
  {
    id: 'nam',
    shortName: profileMap.nam.shortName,
    title: profileMap.nam.name,
    description: profileMap.nam.description,
    toneCharacteristics: profileMap.nam.toneCharacteristics,
    // Nam: cam pha đỏ ấm (<= 15%)
    accentOverlayClass:
      'bg-gradient-to-b from-red-500/15 via-orange-500/12 to-transparent mix-blend-soft-light',
    badgeGradientClass: 'from-[var(--vt-red)]/90 to-[var(--vt-orange)]/90',
    mascotSrc: '/assets/be-lac-cool-success.png',
    mascotCaption: 'Bé Lạc về tới miền Nam!',
    recommendedStage: 'stage3_compounds',
    dividerTitle: 'Bạn đang đi vào Miền Nam',
    dividerSubtitle: 'Ngữ điệu mềm mại từ Sài Gòn hoa lệ đến đất mũi Cà Mau',
    landmarks: [
      {
        id: 'cho-noi-cai-rang',
        name: 'Chợ nổi Cái Răng',
        src: '/assets/landmarks/cho-noi-cai-rang.svg',
        position: 'left',
        depth: 'near',
        topPercent: 18,
        floatDuration: 4.3,
        mobileVisible: true,
      },
      {
        id: 'nha-tho-duc-ba',
        name: 'Bưu điện Thành phố – Nhà thờ Đức Bà',
        src: '/assets/landmarks/nha-tho-duc-ba.svg',
        position: 'right',
        depth: 'far',
        topPercent: 32,
        floatDuration: 5.3,
        mobileVisible: false,
      },
      {
        id: 'cho-ben-thanh',
        name: 'Chợ Bến Thành',
        src: '/assets/landmarks/cho-ben-thanh.svg',
        position: 'left',
        depth: 'near',
        topPercent: 52,
        floatDuration: 4.7,
        mobileVisible: true,
      },
      {
        id: 'dinh-doc-lap',
        name: 'Dinh Độc Lập',
        src: '/assets/landmarks/dinh-doc-lap.svg',
        position: 'right',
        depth: 'far',
        topPercent: 67,
        floatDuration: 5.5,
        mobileVisible: false,
      },
      {
        id: 'dat-mui-ca-mau',
        name: 'Đất Mũi Cà Mau',
        src: '/assets/landmarks/dat-mui-ca-mau.svg',
        position: 'left',
        depth: 'near',
        topPercent: 83,
        floatDuration: 4.5,
        mobileVisible: false,
      },
    ],
  },
];
