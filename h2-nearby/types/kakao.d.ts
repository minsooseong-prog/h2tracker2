/* Kakao Maps JavaScript SDK 중 이 프로젝트에서 실제로 쓰는 부분만 선언합니다. */

declare namespace kakao.maps {
  class LatLng {
    constructor(lat: number, lng: number);
    getLat(): number;
    getLng(): number;
  }

  class LatLngBounds {
    constructor();
    extend(latlng: LatLng): void;
    isEmpty(): boolean;
  }

  class Map {
    constructor(container: HTMLElement, options: { center: LatLng; level?: number });
    setCenter(latlng: LatLng): void;
    panTo(latlng: LatLng): void;
    setLevel(level: number, options?: { animate?: boolean }): void;
    getLevel(): number;
    setBounds(bounds: LatLngBounds, paddingTop?: number, paddingRight?: number, paddingBottom?: number, paddingLeft?: number): void;
    relayout(): void;
  }

  class CustomOverlay {
    constructor(options: {
      position: LatLng;
      content: HTMLElement | string;
      map?: Map | null;
      yAnchor?: number;
      xAnchor?: number;
      zIndex?: number;
      clickable?: boolean;
    });
    setMap(map: Map | null): void;
    setZIndex(zIndex: number): void;
  }

  function load(callback: () => void): void;

  namespace event {
    function addListener(target: object, type: string, handler: () => void): void;
  }

  namespace services {
    class Places {
      keywordSearch(
        keyword: string,
        callback: (
          data: Array<{ place_name: string; address_name: string; road_address_name?: string; x: string; y: string }>,
          status: string,
        ) => void,
      ): void;
    }
    class Geocoder {
      addressSearch(
        address: string,
        callback: (data: Array<{ address_name: string; x: string; y: string }>, status: string) => void,
      ): void;
    }
    const Status: { OK: string; ZERO_RESULT: string; ERROR: string };
  }
}

interface Window {
  kakao?: typeof kakao;
}
