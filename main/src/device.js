import * as config from './config';

class Device {
  // public
  static isSaveModeEnable = JSON.parse(localStorage.getItem('saveModeON'));
  static currentDeviceMode = '';

  // private
  static _clickCounter = 0;

  /**
  * AutoHide navigation bar
  */
  static fulscreenMode() {
    const autoHideNavigationBar = true;
    window.navigationbar.setUp(autoHideNavigationBar);
  }

  /**
  * Show toast with some message
  * @param {string} message - user message for toast
  */
  static showToast(message) {
    window.plugins.toast.showWithOptions({
      message,
      duration: '3000',
      position: 'center',
      styling: {
        opacity: 0.75,
        textColor: '#FFFF00',
        textSize: 26.5,
        cornerRadius: 16,
      },
    });
  }

  static showPrompt(message, onSuccess) {
    navigator.notification.prompt(
      message, // message
      onSuccess,
      config.PROGRAM_NAME,
      ['Ok', 'Exit'],
    );
  }

  /**
  * set Brightness for screen
  * @param {float} value brightness of screen [0.0,... 1]
  */
  static setBrightness(value) {
    if (isNaN(value) || value > 1 || value < 0) return;
    if (window.cordova.plugins.brightness) {
      window.cordova.plugins.brightness.setBrightness(value);
    }
  }

  /**
  * Set device mode (sleeped or active)
  * @param {boolean} sleeped set devise to save mode
  */
  static setDeviceSleeping(sleeped) {
    const { WifiManager } = window.cordova.plugins;
    WifiManager.setWifiEnabled(!sleeped);

    WifiManager.onwifistatechanged = function (data) {
      Device.showToast(`Wifi ${data.wifiState.toLocaleLowerCase()}!`);
    };
    window.cordova.plugins.brightness.setKeepScreenOn(!sleeped);
    if (sleeped) {
      Device.setBrightness(0);
      window.screenLocker.lock();
    } else {
      window.screenLocker.unlock();
    }
  }

  /**
  * Set device config for special mode
  * @param {string} mode default IDLE_MODE ( SLEEP_MODE || ACTIVE_MODE || MIDDLE_MODE )
  */
  static setMode(mode) {
    if (mode === Device.currentDeviceMode) return;
    switch (mode) {
      case 'SLEEP_MODE': {
        if (Device.isSaveModeEnable) {
          Device.setDeviceSleeping(true);
          Device.currentDeviceMode = 'SLEEP_MODE';
        }
        break;
      }
      case 'ACTIVE_MODE': {
        Device.setDeviceSleeping(false);
        Device.setBrightness(config[mode].brightness);
        Device.currentDeviceMode = 'ACTIVE_MODE';
        break;
      }
      case 'MIDDLE_MODE': {
        Device.setDeviceSleeping(false);
        Device.setBrightness(config[mode].brightness);
        Device.currentDeviceMode = 'MIDDLE_MODE';
        break;
      }
      default: {
        Device.setDeviceSleeping(false);
        Device.setBrightness(config.IDLE_MODE.brightness);
        Device.currentDeviceMode = 'IDLE_MODE';
      }
    }
  }

  /**
   * Return Promise with photo from front Camera
   */
  static createPhoto() {
    return new Promise((resolve, reject) => {
      const onSuccess = image => resolve(image);
      const onFail = message => reject(new Error(`Failed because: ${message}`));

      if (navigator.camera) {
        navigator.camera.cleanup();
        navigator.camera.getPicture(
          onSuccess, onFail,
          {
            quality: 50,
            destinationType: window.Camera.DestinationType.DATA_URL,
            encodingType: window.Camera.EncodingType.PNG,
            cameraDirection: 0,
            targetWidth: 200,
            targetHeight: 200,
          },
        );
      } else {
        reject(new Error('camera failed'));
      }
    });
  }

  static switchOnCamera() {
    const options = {
      x: 0,
      y: 0,
      width: '1',
      height: '1',
      camera: window.CameraPreview.CAMERA_DIRECTION.FRONT,
      toBack: false,
      tapPhoto: false,
      tapFocus: false,
      previewDrag: false,
    };
    window.CameraPreview.startCamera(options);
  }
  static switchOffCamera() {
    window.CameraPreview.stopCamera();
  }

  /**
   * Get base64 image from camera (require run switchOnCamera() method before )
   * @returns {string} base64 image
   */
  static createRealTimePhoto() {
    return new Promise((resolve) => {
      window.CameraPreview.takePicture({
        width: 640,
        height: 640,
        quality: 100,
      }, base64PictureData => resolve(`${base64PictureData}`));
    });
  }

  static showAlert(message) {
    navigator.notification.alert(message, null, config.PROGRAM_NAME, 'OK');
  }

  // Events
  /**
  * Run function after 5 times touch
  * @param {function} callback
  */
  static quinaryClick(callback) {
    Device._clickCounter += 1;
    if (Device._clickCounter === 1) {
      Device.setMode('ACTIVE_MODE');
    }
    if (Device._clickCounter === 5) {
      callback();
      Device._clickCounter = 0;
    }
    setTimeout(() => {
      Device._clickCounter = 0;
    }, 2000);
  }
}

export default Device;
