/**
 * 카카오맵 JavaScript SDK 중 이 프로젝트가 실제로 사용하는 부분만 선언한다.
 * 전체 타입 패키지를 의존성으로 추가하지 않기 위한 최소 선언이다.
 */

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

  class Size {
    constructor(width: number, height: number);
  }

  class Point {
    constructor(x: number, y: number);
  }

  interface MapOptions {
    center: LatLng;
    level?: number;
    draggable?: boolean;
  }

  class Map {
    constructor(container: HTMLElement, options: MapOptions);
    setCenter(latlng: LatLng): void;
    getCenter(): LatLng;
    setLevel(level: number, options?: { animate?: boolean }): void;
    getLevel(): number;
    panTo(latlng: LatLng): void;
    setBounds(bounds: LatLngBounds, paddingTop?: number, paddingRight?: number, paddingBottom?: number, paddingLeft?: number): void;
    relayout(): void;
  }

  interface CustomOverlayOptions {
    position: LatLng;
    content: HTMLElement | string;
    map?: Map | null;
    yAnchor?: number;
    xAnchor?: number;
    zIndex?: number;
    clickable?: boolean;
  }

  class CustomOverlay {
    constructor(options: CustomOverlayOptions);
    setMap(map: Map | null): void;
    setPosition(latlng: LatLng): void;
    setZIndex(zIndex: number): void;
    getPosition(): LatLng;
  }

  namespace event {
    function addListener(target: object, type: string, handler: (...args: unknown[]) => void): void;
    function removeListener(target: object, type: string, handler: (...args: unknown[]) => void): void;
  }

  function load(callback: () => void): void;

  namespace services {
    const Status: {
      OK: string;
      ZERO_RESULT: string;
      ERROR: string;
    };

    interface PlacesSearchResultItem {
      id: string;
      place_name: string;
      address_name: string;
      road_address_name: string;
      x: string;
      y: string;
    }

    class Places {
      constructor();
      keywordSearch(
        keyword: string,
        callback: (result: PlacesSearchResultItem[], status: string) => void,
        options?: { size?: number },
      ): void;
    }

    interface AddressSearchResultItem {
      address_name: string;
      x: string;
      y: string;
    }

    class Geocoder {
      constructor();
      addressSearch(
        address: string,
        callback: (result: AddressSearchResultItem[], status: string) => void,
      ): void;
    }
  }
}

interface Window {
  kakao?: typeof kakao;
}
