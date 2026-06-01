/**
 * microSySTEM-Chifoumi
 */
//% weight=100 color=#E67E22 icon="\uf11b" block="microSySTEM Chifoumi"
namespace microSySTEM_Chifoumi {

    // =========================
    // DFR1216 LOW LEVEL
    // =========================

    const DFR1216_ADDR = 0x33

    const I2C_SERVO0_DUTY_H = 0x18
    const I2C_BATTERY = 0x87
    const I2C_WS2812_STATE = 0x90

    let dfr1216Initialized = false

    function initDFR1216(): void {
        if (!dfr1216Initialized) {
            dfr1216Initialized = true
            basic.pause(100)
        }
    }

    function writeReg(reg: number, data: Buffer): void {
        let buf = pins.createBuffer(data.length + 1)
        buf[0] = reg
        for (let i = 0; i < data.length; i++) {
            buf[i + 1] = data[i]
        }
        pins.i2cWriteBuffer(DFR1216_ADDR, buf)
    }

    function readReg(reg: number, len: number): Buffer {
        pins.i2cWriteNumber(DFR1216_ADDR, reg, NumberFormat.UInt8BE)
        return pins.i2cReadBuffer(DFR1216_ADDR, len)
    }

    // =========================
    // ENUMS
    // =========================

    export enum BoardRGBLed {
        //% block="RGB0"
        RGB0 = 0,
        //% block="RGB1"
        RGB1 = 1,
        //% block="both"
        Both = 2
    }

    export enum ChifoumiColor {
        //% block="red"
        Red,
        //% block="green"
        Green,
        //% block="blue"
        Blue,
        //% block="yellow"
        Yellow,
        //% block="cyan"
        Cyan,
        //% block="magenta"
        Magenta,
        //% block="white"
        White,
        //% block="orange"
        Orange,
        //% block="purple"
        Purple,
        //% block="off"
        Off
    }

    // =========================
    // SERVO ON S0
    // =========================

    /**
     * Set the angle of the disc servo motor connected to S0.
     */
    //% block="set disc servo angle to %angle °"
    //% angle.min=0 angle.max=180
    //% angle.defl=90
    //% group="Servo"
    export function setDiscServoAngle(angle: number): void {
        initDFR1216()

        angle = Math.clamp(0, 180, angle)

        // Servo pulse:
        // 0°   -> about 500 us
        // 180° -> about 2480 us
        let pulse = 500 + angle * 11

        let buf = pins.createBuffer(2)
        buf[0] = (pulse >> 8) & 0xFF
        buf[1] = pulse & 0xFF

        writeReg(I2C_SERVO0_DUTY_H, buf)
    }

    // =========================
    // ULTRASONIC SENSOR ON P2
    // Grove Ultrasonic Ranger
    // =========================

    /**
     * Read ultrasonic distance in centimeters using P2.
     */
    //% block="ultrasonic distance on P2 (cm)"
    //% group="Ultrasonic sensor"
    export function ultrasonicDistanceCm(): number {
        pins.setPull(DigitalPin.P2, PinPullMode.PullNone)

        pins.digitalWritePin(DigitalPin.P2, 0)
        control.waitMicros(2)

        pins.digitalWritePin(DigitalPin.P2, 1)
        control.waitMicros(10)

        pins.digitalWritePin(DigitalPin.P2, 0)

        let duration = pins.pulseIn(DigitalPin.P2, PulseValue.High, 30000)

        if (duration == 0) {
            return -1
        }

        // Distance in cm = echo duration / 58
        return Math.round(duration / 58)
    }

    /**
     * Return true if a hand is detected under the selected distance.
     */
    //% block="hand detected on P2 under %distance cm"
    //% distance.min=1 distance.max=100
    //% distance.defl=15
    //% group="Ultrasonic sensor"
    export function handDetected(distance: number): boolean {
        let d = ultrasonicDistanceCm()
        return d > 0 && d <= distance
    }

    // =========================
    // LCD GROVE RGB 16x2
    // Grove 104020111
    // LCD address: 0x3E
    // RGB backlight address: 0x62
    // =========================

    const LCD_ADDRESS = 0x3E
    const LCD_RGB_ADDRESS = 0x62

    let lcdReady = false

    function lcdCommand(command: number): void {
        let buf = pins.createBuffer(2)
        buf[0] = 0x80
        buf[1] = command
        pins.i2cWriteBuffer(LCD_ADDRESS, buf)
        basic.pause(2)
    }

    function lcdData(data: number): void {
        let buf = pins.createBuffer(2)
        buf[0] = 0x40
        buf[1] = data
        pins.i2cWriteBuffer(LCD_ADDRESS, buf)
    }

    function lcdRgbRegister(register: number, value: number): void {
        let buf = pins.createBuffer(2)
        buf[0] = register
        buf[1] = value
        pins.i2cWriteBuffer(LCD_RGB_ADDRESS, buf)
    }

    function ensureLcd(): void {
        if (!lcdReady) {
            lcdInit()
        }
    }

    function colorToRGB(color: ChifoumiColor): number[] {
        switch (color) {
            case ChifoumiColor.Red: return [255, 0, 0]
            case ChifoumiColor.Green: return [0, 255, 0]
            case ChifoumiColor.Blue: return [0, 0, 255]
            case ChifoumiColor.Yellow: return [255, 255, 0]
            case ChifoumiColor.Cyan: return [0, 255, 255]
            case ChifoumiColor.Magenta: return [255, 0, 255]
            case ChifoumiColor.White: return [255, 255, 255]
            case ChifoumiColor.Orange: return [255, 80, 0]
            case ChifoumiColor.Purple: return [120, 0, 255]
            case ChifoumiColor.Off:
            default: return [0, 0, 0]
        }
    }

    /**
     * Initialize the LCD screen.
     */
    //% block="initialize LCD"
    //% group="LCD"
    export function lcdInit(): void {
        basic.pause(50)

        lcdCommand(0x38)
        basic.pause(5)
        lcdCommand(0x39)
        basic.pause(5)
        lcdCommand(0x14)
        lcdCommand(0x70)
        lcdCommand(0x56)
        lcdCommand(0x6C)
        basic.pause(200)
        lcdCommand(0x38)
        lcdCommand(0x0C)
        lcdCommand(0x01)
        basic.pause(10)

        lcdRgbRegister(0x00, 0x00)
        lcdRgbRegister(0x01, 0x00)
        lcdRgbRegister(0x08, 0xAA)

        lcdReady = true
        lcdSetBacklightRGB(255, 255, 255)
    }

    /**
     * Clear the LCD screen.
     */
    //% block="clear LCD"
    //% group="LCD"
    export function lcdClear(): void {
        ensureLcd()
        lcdCommand(0x01)
        basic.pause(10)
    }

    /**
     * Set the LCD cursor position.
     */
    //% block="set LCD cursor column %column line %line"
    //% column.min=0 column.max=15
    //% column.defl=0
    //% line.min=1 line.max=2
    //% line.defl=1
    //% group="LCD"
    export function lcdSetCursor(column: number, line: number): void {
        ensureLcd()

        column = Math.clamp(0, 15, column)
        line = Math.clamp(1, 2, line)

        let address = column
        if (line == 2) {
            address += 0x40
        }

        lcdCommand(0x80 | address)
    }

    /**
     * Show text at the current cursor position.
     */
    //% block="LCD show text %text"
    //% text.defl="Hello"
    //% group="LCD"
    export function lcdShowText(text: string): void {
        ensureLcd()

        for (let i = 0; i < text.length; i++) {
            lcdData(text.charCodeAt(i))
        }
    }

    /**
     * Show text on a selected LCD line.
     */
    //% block="LCD show text %text on line %line"
    //% text.defl="Chifoumi"
    //% line.min=1 line.max=2
    //% line.defl=1
    //% group="LCD"
    export function lcdShowTextLine(text: string, line: number): void {
        ensureLcd()

        line = Math.clamp(1, 2, line)
        lcdSetCursor(0, line)

        for (let i = 0; i < 16; i++) {
            if (i < text.length) {
                lcdData(text.charCodeAt(i))
            } else {
                lcdData(32)
            }
        }
    }

    /**
     * Show a number on a selected LCD line.
     */
    //% block="LCD show number %value on line %line"
    //% line.min=1 line.max=2
    //% line.defl=2
    //% group="LCD"
    export function lcdShowNumberLine(value: number, line: number): void {
        lcdShowTextLine("" + value, line)
    }

    /**
     * Set the LCD RGB backlight with a color menu.
     */
    //% block="set LCD backlight to %color"
    //% group="LCD"
    export function lcdSetBacklightColor(color: ChifoumiColor): void {
        let rgb = colorToRGB(color)
        lcdSetBacklightRGB(rgb[0], rgb[1], rgb[2])
    }

    /**
     * Set the LCD RGB backlight with RGB values.
     */
    //% block="set LCD backlight red %red green %green blue %blue"
    //% red.min=0 red.max=255
    //% red.defl=255
    //% green.min=0 green.max=255
    //% green.defl=255
    //% blue.min=0 blue.max=255
    //% blue.defl=255
    //% group="LCD"
    export function lcdSetBacklightRGB(red: number, green: number, blue: number): void {
        red = Math.clamp(0, 255, red)
        green = Math.clamp(0, 255, green)
        blue = Math.clamp(0, 255, blue)

        lcdRgbRegister(0x04, red)
        lcdRgbRegister(0x03, green)
        lcdRgbRegister(0x02, blue)
    }

    /**
     * Turn off the LCD backlight.
     */
    //% block="turn off LCD backlight"
    //% group="LCD"
    export function lcdBacklightOff(): void {
        lcdSetBacklightRGB(0, 0, 0)
    }

    // =========================
    // EXTERNAL RGB LED DFR0605
    // WS2812 / NeoPixel on P0
    // =========================

    let discLed: neopixel.Strip = null
    let discLedCount = 1

    function ensureDiscLed(): void {
        if (discLed == null) {
            discLed = neopixel.create(DigitalPin.P0, discLedCount, NeoPixelMode.RGB)
            discLed.setBrightness(80)
            discLed.clear()
            discLed.show()
        }
    }

    function colorToNeoPixel(color: ChifoumiColor): number {
        switch (color) {
            case ChifoumiColor.Red: return neopixel.colors(NeoPixelColors.Red)
            case ChifoumiColor.Green: return neopixel.colors(NeoPixelColors.Green)
            case ChifoumiColor.Blue: return neopixel.colors(NeoPixelColors.Blue)
            case ChifoumiColor.Yellow: return neopixel.colors(NeoPixelColors.Yellow)
            case ChifoumiColor.Cyan: return neopixel.rgb(0, 255, 255)
            case ChifoumiColor.Magenta: return neopixel.rgb(255, 0, 255)
            case ChifoumiColor.White: return neopixel.colors(NeoPixelColors.White)
            case ChifoumiColor.Orange: return neopixel.colors(NeoPixelColors.Orange)
            case ChifoumiColor.Purple: return neopixel.colors(NeoPixelColors.Purple)
            case ChifoumiColor.Off:
            default: return neopixel.colors(NeoPixelColors.Black)
        }
    }

    /**
     * Initialize the disc RGB LED connected to P0.
     */
    //% block="initialize disc RGB LED with %count LED(s)"
    //% count.min=1 count.max=60
    //% count.defl=1
    //% group="Disc RGB LED"
    export function initDiscRgbLed(count: number): void {
        discLedCount = Math.clamp(1, 60, count)
        discLed = neopixel.create(DigitalPin.P0, discLedCount, NeoPixelMode.RGB)
        discLed.setBrightness(80)
        discLed.clear()
        discLed.show()
    }

    /**
     * Set the disc RGB LED brightness.
     */
    //% block="set disc RGB LED brightness to %brightness \\%"
    //% brightness.min=0 brightness.max=100
    //% brightness.defl=30
    //% group="Disc RGB LED"
    export function setDiscRgbBrightness(brightness: number): void {
        ensureDiscLed()

        brightness = Math.clamp(0, 100, brightness)
        discLed.setBrightness(Math.map(brightness, 0, 100, 0, 255))
        discLed.show()
    }

    /**
     * Set all disc RGB LEDs to a selected color.
     */
    //% block="set disc RGB LED to %color"
    //% group="Disc RGB LED"
    export function setDiscRgbColor(color: ChifoumiColor): void {
        ensureDiscLed()
        discLed.showColor(colorToNeoPixel(color))
    }

    /**
     * Set all disc RGB LEDs with RGB values.
     */
    //% block="set disc RGB LED red %red green %green blue %blue"
    //% red.min=0 red.max=255
    //% red.defl=255
    //% green.min=0 green.max=255
    //% green.defl=255
    //% blue.min=0 blue.max=255
    //% blue.defl=255
    //% group="Disc RGB LED"
    export function setDiscRgb(red: number, green: number, blue: number): void {
        ensureDiscLed()

        red = Math.clamp(0, 255, red)
        green = Math.clamp(0, 255, green)
        blue = Math.clamp(0, 255, blue)

        discLed.showColor(neopixel.rgb(red, green, blue))
    }

    /**
     * Turn off the disc RGB LED.
     */
    //% block="turn off disc RGB LED"
    //% group="Disc RGB LED"
    export function clearDiscRgbLed(): void {
        ensureDiscLed()
        discLed.clear()
        discLed.show()
    }

    /**
     * Show a rainbow effect on the disc RGB LED strip.
     */
    //% block="show rainbow on disc RGB LED"
    //% group="Disc RGB LED"
    export function showDiscRgbRainbow(): void {
        ensureDiscLed()
        discLed.showRainbow(1, 360)
        discLed.show()
    }

    // =========================
    // DFR1216 SYSTEM
    // =========================

    /**
     * Read the DFR1216 battery level in percent.
     */
    //% block="DFR1216 battery level (\\%)"
    //% group="DFR1216"
    export function batteryLevel(): number {
        initDFR1216()
        return readReg(I2C_BATTERY, 1)[0]
    }

    // =========================
    // DFR1216 ONBOARD RGB LEDS
    // =========================

    let boardBrightness = 255

    let boardRgb0R = 0
    let boardRgb0G = 0
    let boardRgb0B = 0

    let boardRgb1R = 0
    let boardRgb1G = 0
    let boardRgb1B = 0

    function updateBoardRgb(): void {
        initDFR1216()

        let buf = pins.createBuffer(8)
        buf[0] = 1
        buf[1] = boardBrightness
        buf[2] = boardRgb0R
        buf[3] = boardRgb0G
        buf[4] = boardRgb0B
        buf[5] = boardRgb1R
        buf[6] = boardRgb1G
        buf[7] = boardRgb1B

        writeReg(I2C_WS2812_STATE, buf)
    }

    /**
     * Set the brightness of the two onboard DFR1216 RGB LEDs.
     */
    //% block="set DFR1216 RGB LED brightness to %brightness \\%"
    //% brightness.min=0 brightness.max=100
    //% brightness.defl=30
    //% group="DFR1216 RGB LEDs"
    export function setBoardRgbBrightness(brightness: number): void {
        brightness = Math.clamp(0, 100, brightness)
        boardBrightness = Math.map(brightness, 0, 100, 0, 255)
        updateBoardRgb()
    }

    /**
     * Set one or both onboard DFR1216 RGB LEDs to a selected color.
     */
    //% block="set DFR1216 %led to %color"
    //% group="DFR1216 RGB LEDs"
    export function setBoardRgbColor(led: BoardRGBLed, color: ChifoumiColor): void {
        let rgb = colorToRGB(color)
        setBoardRgb(led, rgb[0], rgb[1], rgb[2])
    }

    /**
     * Set one or both onboard DFR1216 RGB LEDs with RGB values.
     */
    //% block="set DFR1216 %led red %red green %green blue %blue"
    //% red.min=0 red.max=255
    //% red.defl=255
    //% green.min=0 green.max=255
    //% green.defl=255
    //% blue.min=0 blue.max=255
    //% blue.defl=255
    //% group="DFR1216 RGB LEDs"
    export function setBoardRgb(led: BoardRGBLed, red: number, green: number, blue: number): void {
        red = Math.clamp(0, 255, red)
        green = Math.clamp(0, 255, green)
        blue = Math.clamp(0, 255, blue)

        if (led == BoardRGBLed.RGB0 || led == BoardRGBLed.Both) {
            boardRgb0R = red
            boardRgb0G = green
            boardRgb0B = blue
        }

        if (led == BoardRGBLed.RGB1 || led == BoardRGBLed.Both) {
            boardRgb1R = red
            boardRgb1G = green
            boardRgb1B = blue
        }

        updateBoardRgb()
    }

    /**
     * Turn off one or both onboard DFR1216 RGB LEDs.
     */
    //% block="turn off DFR1216 %led"
    //% group="DFR1216 RGB LEDs"
    export function clearBoardRgb(led: BoardRGBLed): void {
        setBoardRgb(led, 0, 0, 0)
    }

    /**
     * Turn off the two onboard DFR1216 RGB LEDs.
     */
    //% block="turn off all DFR1216 RGB LEDs"
    //% group="DFR1216 RGB LEDs"
    export function clearAllBoardRgb(): void {
        boardRgb0R = 0
        boardRgb0G = 0
        boardRgb0B = 0

        boardRgb1R = 0
        boardRgb1G = 0
        boardRgb1B = 0

        updateBoardRgb()
    }
}