import * as React from "react"
import {upload} from "gyaonup";
import HoverToPlayText from "./HoverToPlayText";
import axios from "axios";

declare var Linda: any;

const getTime = () => {
    const now = new Date();
    const hour = now.getHours();
    const min = now.getMinutes();
    const sec = now.getSeconds();
    return `${hour}:${min}:${sec}`
};

interface Tuple {
    user: string,
    message: string,
    url: string
}

interface GyaonResponse {
    endpoint: string,
    object: {
        key: string
    }
}

interface RootState {
    reactions: JSX.Element[]
}

export default class Root extends React.Component<{}, RootState> {
    private ctx: AudioContext = new AudioContext();
    private scriptProcessor: ScriptProcessorNode;
    private localMediaStream: MediaStream;
    private mediaStreamSource: MediaStreamAudioSourceNode;
    private audioBufferArray: Array<Float32Array> = [];

    private readonly MAX_RECORD_MIN: number = 5;
    private readonly BUFFER_SIZE: number = 4096;
    private readonly SAMPLE_RATE: number = this.ctx.sampleRate;

    constructor(props) {
        super(props);
        this.state = {
            reactions: []
        }
    }

    async componentDidMount() {
        await this.requestPermission();
        this.start();

        const io = require("../../lib/socket.io.js");
        const socket = io.connect("https://linda-server.herokuapp.com");
        require("../../lib/linda.js");
        const linda = new Linda().connect(socket);
        const ts = linda.tuplespace("masuilab");

        linda.io.on('connect', () => {
            console.dir('socket.io connect!!');
            ts.watch({type: "gyaon"}, (err, tuple) => {
                if (err) {
                    console.dir(err)
                } else {
                    console.log(tuple.data);
                    // this.upload();
                    this.receiveReaction(tuple.data)
                }
            });
        });
    }

    receiveReaction = async (tuple: Tuple) => {
        const {user, message, url} = tuple;
        new Audio(url).play(); //リアクションだけ再生
        const {endpoint, object} = await this.upload();
        const reactionAudio = <HoverToPlayText src={url} text={message}/>;
        const contentAudio = <HoverToPlayText src={`${endpoint}/sound/${object.key}`} text=""/>;
        const el = <li>{getTime()} {contentAudio} -> {user} 「{reactionAudio}」</li>;
        this.setState({
            reactions: [el, ...this.state.reactions]//this.state.reactions.push(el)
        });
        await axios.post(`${endpoint}/comment/${object.key}`, {value: `${user} reacted with "${message}"`})
    };

    requestPermission = async () => {
        try {
            this.localMediaStream = await navigator.mediaDevices.getUserMedia({audio: true})
        } catch (e) {
            location.reload();
        }
    };

    start = () => {
        this.mediaStreamSource = this.ctx.createMediaStreamSource(this.localMediaStream);
        this.scriptProcessor = this.ctx.createScriptProcessor(this.BUFFER_SIZE, 1, 1);
        this.mediaStreamSource.connect(this.scriptProcessor);
        this.scriptProcessor.onaudioprocess = (event => {
            const channel = event.inputBuffer.getChannelData(0);
            if (this.audioBufferArray.length * this.BUFFER_SIZE > this.SAMPLE_RATE * this.MAX_RECORD_MIN) {
                this.audioBufferArray.shift()
            }
            this.audioBufferArray.push(new Float32Array(channel))
        });
        this.scriptProcessor.connect(this.ctx.destination);
    };

    //本当は撮りっぱなし
    stop = () => {
        this.scriptProcessor.disconnect();
        if (this.localMediaStream) {
            const stop = this.localMediaStream.stop;
            stop && stop()
        }
    };

    encodeWAV = (samples, sampleRate) => {
        const buffer = new ArrayBuffer(44 + samples.length * 2);
        const view = new DataView(buffer);
        const writeString = (view, offset, string) => {
            for (let i = 0, offs = offset | 0, max = string.length | 0; i < max; i = (i + 1) | 0) {
                view.setUint8(offs + i, string.charCodeAt(i))
            }
        };
        const floatTo16BitPCM = (output, offset, input) => {
            for (let i = 0; i < input.length; i = (i + 1) | 0, offset = (offset + 2) | 0) {
                const s = Math.max(-1, Math.min(1, input[i]));
                output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
            }
        };
        writeString(view, 0, 'RIFF'); // RIFFヘッダ
        view.setUint32(4, 32 + samples.length * 2, true); // これ以降のファイルサイズ
        writeString(view, 8, 'WAVE'); // WAVEヘッダ
        writeString(view, 12, 'fmt '); // fmtチャンク
        view.setUint32(16, 16, true); // fmtチャンクのバイト数
        view.setUint16(20, 1, true); // フォーマットID
        view.setUint16(22, 1, true); // チャンネル数
        view.setUint32(24, sampleRate, true); // サンプリングレート
        view.setUint32(28, sampleRate * 2, true); // データ速度
        view.setUint16(32, 2, true); // ブロックサイズ
        view.setUint16(34, 16, true); // サンプルあたりのビット数
        writeString(view, 36, 'data'); // dataチャンク
        view.setUint32(40, samples.length * 2, true); // 波形データのバイト数
        floatTo16BitPCM(view, 44, samples); // 波形データ
        return view
    };

    mergeBuffers = () => {
        const buffer = [...this.audioBufferArray];
        let i, j, max, imax, jmax;
        let sampleLength = 0;
        for (i = 0, max = buffer.length; i < max; i = (i + 1) | 0) {
            sampleLength = (sampleLength + buffer[i].length) | 0
        }
        const samples = new Float32Array(sampleLength);
        let sampleIdx = 0;
        for (i = 0, imax = buffer.length; i < imax; i = (i + 1) | 0) {
            for (j = 0, jmax = buffer[i].length; j < jmax; j = (j + 1) | 0) {
                samples[sampleIdx] = buffer[i][j];
                sampleIdx = (sampleIdx + 1) | 0
            }
        }
        return samples
    };

    upload = async () => {
        const dataview = this.encodeWAV(this.mergeBuffers(), this.SAMPLE_RATE);
        const blob = new Blob([dataview], {type: 'audio/wav'});
        const res = await upload("masuilab", blob);
        return res["data"] as GyaonResponse;
    };

    render() {
        return (
            <div>
                <h1>gyaon-receiver</h1>
                <span>受信先: masuilab</span>
                <ul>{this.state.reactions}</ul>
            </div>
        )
    }
}
