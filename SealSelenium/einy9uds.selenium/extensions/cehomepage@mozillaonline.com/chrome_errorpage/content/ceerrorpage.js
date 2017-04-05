(function() {
  function addURLLink(event) {
    var contentDoc=event.target;

    var contentWin=contentDoc.defaultView;
    if(contentDoc.documentURI.match(/^about:neterror/) && contentWin == contentWin.top){
      var errorPageContainer = contentDoc.getElementById('errorPageContainer');
      var errorPageBody = contentDoc.body;

      // Add 'Go To Homepage' button
      var btnChildren = contentDoc.querySelector('#errorPageContainer > button');
      if (btnChildren && btnChildren.style.display !== 'none') {
        var goToHomePageBtn = contentDoc.createElement('button');
        goToHomePageBtn.id = 'goToHomePage';
        var stringBundle = document.getElementById('ceerrorpage-strings');
        goToHomePageBtn.textContent = stringBundle.getString('goToHomePage');
        goToHomePageBtn.addEventListener('click', function () {
          contentWin.location = 'http://e.firefoxchina.cn/?from_err_btn';
        });      
        if (btnChildren) {
          errorPageContainer.insertBefore(goToHomePageBtn, btnChildren);
        } else {
          errorPageContainer.appendChild(goToHomePageBtn);
        }
      }

      // Reset the default error page css
      var domWindowUtils = contentWin.QueryInterface(Ci.nsIInterfaceRequestor).
        getInterface(Ci.nsIDOMWindowUtils);
      var cssUri = Services.io.newURI('chrome://ceerrorpage/skin/overlay.css', null, null);
      domWindowUtils.loadSheet(cssUri, Ci.nsIDOMWindowUtils.AUTHOR_SHEET);

      // Add site recomandation iframe to the default error page
      if (window.navigator.onLine) {
        var recomendIframe = contentDoc.createElement('iframe');
        recomendIframe.id = 'recomendIframe';
        recomendIframe.height = '0px';
        errorPageBody.appendChild(recomendIframe);
        recomendIframe.src = 'http://newtab.firefoxchina.cn/error-tab-rec.html';
        recomendIframe.addEventListener('load', function(){
          if (recomendIframe.contentWindow.document.URL.match(/^about:neterror/)) {
            errorPageBody.removeChild(recomendIframe);
          } else {
            recomendIframe.height = '330px';
          }
        }, false);
        var timer = 0;
        var interval = setInterval(function(){
          if(timer < 150 && recomendIframe.contentDocument) {
            if(recomendIframe.contentDocument.readyState == 'complete' || recomendIframe.contentDocument.readyState == 'interactive') {
              if (recomendIframe.contentWindow.document.URL.match(/^about:neterror/)) {
                errorPageBody.removeChild(recomendIframe);
              } else {
                recomendIframe.height = '330px';
              }
              timer = 0;
              clearInterval(interval);
            } else {
              timer++;
            }
          } else {
            timer = 0;
            clearInterval(interval);
          }
        }, 200);
      }
    }
  }

  window.addEventListener('load', function() {
    window.setTimeout(function() {
      document.getElementById('appcontent').addEventListener('DOMContentLoaded', addURLLink, false);
    }, 1000);
  }, false);
})();
