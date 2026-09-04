const CACHE_NAME = 'wanhuyul-v6';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];



self.addEventListener(
  'install',

  event => {

    event.waitUntil(

      caches
        .open(CACHE_NAME)

        .then(
          cache =>
            cache.addAll(APP_SHELL)
        )

    );


    self.skipWaiting();

  }

);



self.addEventListener(
  'activate',

  event => {

    event.waitUntil(

      caches
        .keys()

        .then(
          keys =>

            Promise.all(

              keys.map(
                key => {

                  if(
                    key !==
                    CACHE_NAME
                  ){

                    return caches.delete(
                      key
                    );

                  }

                }
              )

            )

        )

    );


    self.clients.claim();

  }

);



self.addEventListener(
  'fetch',

  event => {

    if(
      event.request.method !==
      'GET'
    )
      return;


    const requestUrl =
      new URL(
        event.request.url
      );


    /* 다른 사이트 API는 캐시하지 않음 */

    if(
      requestUrl.origin !==
      self.location.origin
    )
      return;


    /* HTML 페이지는 최신 버전 우선 */

    if(
      event.request.mode ===
      'navigate'
    ){

      event.respondWith(

        fetch(event.request)

          .then(
            response => {

              const responseClone =
                response.clone();


              caches
                .open(CACHE_NAME)

                .then(
                  cache =>

                    cache.put(
                      event.request,
                      responseClone
                    )
                );


              return response;

            }
          )

          .catch(
            () =>

              caches.match(
                event.request
              )

              .then(
                cached =>

                  cached ||
                  caches.match(
                    './index.html'
                  )
              )
          )

      );


      return;

    }


    /* 이미지와 정적 파일은 캐시 우선 */

    event.respondWith(

      caches
        .match(
          event.request
        )

        .then(
          cached => {

            if(cached)
              return cached;


            return fetch(
              event.request
            )

            .then(
              response => {

                const responseClone =
                  response.clone();


                caches
                  .open(CACHE_NAME)

                  .then(
                    cache =>

                      cache.put(
                        event.request,
                        responseClone
                      )
                  );


                return response;

              }
            );

          }
        )

    );

  }

);
