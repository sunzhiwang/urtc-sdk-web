import {
  Component,
  OnInit,
  AfterContentInit,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';

// 注：实际使用时，请使用 import sdk, { Client } from 'urtc-sdk';
import sdk, { Client } from '@sdk';
// 注：实际使用时，请使用 import { Stream } from 'urtc-sdk/types';
import { Stream } from '@sdk/types';

// 注：实际使用时，请自行在 config 目录下创建 index.ts 配置文件
import config from '../../config';

const { AppId, AppKey } = config;

// 此处使用固定的房间号的随机的用户ID，请自行替换
const RoomId = 'ssss02';
const UserId = Math.floor(Math.random() * 1000000).toString();

console.log('UCloudRTC sdk version: ', sdk.version);

@Component({
  selector: 'app-room-page',
  templateUrl: './index.html',
  styleUrls: ['./index.css']
})
export class RoomComponent implements OnInit, AfterContentInit, AfterViewInit, OnDestroy {
  private client: Client;
  private roomId: string = RoomId;
  private userId: string = UserId;
  private isJoinedRoom = false;
  private selectedStream: Stream | null = null;
  private localStreams: Stream[] = [];
  private remoteStreams: Stream[] = [];

  get roomStatus() {
    return this.isJoinedRoom ? '已加入' : '未加入';
  }
  get selectedStreamStatus() {
    return this.selectedStream ? this.selectedStream.sid : '未选择';
  }

  private leaveRoom: () => void;
  private onSelectStream: () => void;

  ngOnInit() {
    if (!AppId || !AppKey) {
      alert('请先设置 AppId 和 AppKey');
      return;
    }
    if (!RoomId) {
      alert('请先设置 RoomId');
      return;
    }
    if (!UserId) {
      alert('请先设置 UserId');
    }
    this.leaveRoom = this.handleLeaveRoom.bind(this);
    this.onSelectStream = this.handleSelectStream.bind(this);
  }

  ngAfterContentInit() {
    const token = sdk.generateToken(AppId, AppKey, RoomId, UserId);
    this.client = new Client(AppId, token);
    this.client.on('stream-published', (localStream) => {
      console.info('stream-published: ', localStream);
      const { localStreams } = this;
      localStreams.push(localStream);
    });
    this.client.on('stream-added', (remoteStream) => {
      console.info('stream-added: ', remoteStream);
      const { remoteStreams } = this;
      remoteStreams.push(remoteStream);
      // 自动订阅
      this.client.subscribe(remoteStream.sid, (err) => {
        console.error('自动订阅失败：', err);
      });
    });
    this.client.on('stream-subscribed', (remoteStream) => {
      console.info('stream-subscribed: ', remoteStream);
      const { remoteStreams } = this;
      const idx = remoteStreams.findIndex(item => item.sid === remoteStream.sid);
      if (idx >= 0) {
        remoteStreams.splice(idx, 1, remoteStream);
      }
    });
    this.client.on('stream-removed', (remoteStream) => {
      console.info('stream-removed: ', remoteStream);
      const { remoteStreams } = this;
      const idx = remoteStreams.findIndex(item => item.sid === remoteStream.sid);
      if (idx >= 0) {
        remoteStreams.splice(idx, 1);
      }
    });

    window.addEventListener('beforeunload', this.leaveRoom);
  }

  ngAfterViewInit() {
    console.log('view inited, todo something');
  }

  ngOnDestroy() {
    console.info('component will destroy');
    window.removeEventListener('beforeunload', this.leaveRoom);
    this.handleLeaveRoom();
  }

  handleJoinRoom() {
    const { roomId, userId, isJoinedRoom } = this;
    if (isJoinedRoom) {
      alert('已经加入了房间');
      return;
    }
    if (!roomId) {
      alert('请先填写房间号');
      return;
    }
    this.client.joinRoom(roomId, userId, () => {
      console.info('加入房间成功');
      this.isJoinedRoom = true;
    }, (err) => {
      console.error('加入房间失败： ', err);
    });
  }
  handlePublish() {
    this.client.publish(err => {
      console.error('发布失败：', err);
    });
  }
  handlePublishScreen() {
    this.client.publish({ audio: true, video: false, screen: true }, (err) => {
      console.error('发布失败：', err);
    });
  }
  handleUnpublish() {
    const { selectedStream } = this;
    if (!selectedStream) {
      alert('未选择需要取消发布的本地流');
      return;
    }
    this.client.unpublish(selectedStream.sid, (stream) => {
      console.info('取消发布本地流成功：', stream);
      const { localStreams } = this;
      const idx = localStreams.findIndex(item => item.sid === stream.sid);
      if (idx >= 0) {
        localStreams.splice(idx, 1);
      }
      this.selectedStream = null;
    }, (err) => {
      console.error('取消发布本地流失败：', err);
    });
  }
  handleSubscribe() {
    const { selectedStream } = this;
    if (!selectedStream) {
      alert('未选择需要订阅的远端流');
      return;
    }
    this.client.subscribe(selectedStream.sid, (err) => {
      console.error('订阅失败：', err);
    });
  }
  handleUnsubscribe() {
    const { selectedStream } = this;
    if (!selectedStream) {
      alert('未选择需要取消订阅的远端流');
      return;
    }
    this.client.unsubscribe(selectedStream.sid, (stream) => {
      console.info('取消订阅成功：', stream);
      const { remoteStreams } = this;
      const idx = remoteStreams.findIndex(item => item.sid === stream.sid);
      if (idx >= 0) {
        remoteStreams.splice(idx, 1, stream);
      }
    }, (err) => {
      console.error('订阅失败：', err);
    });
  }
  handleLeaveRoom() {
    const { isJoinedRoom } = this;
    if (!isJoinedRoom) {
      return;
    }
    this.client.leaveRoom(() => {
      console.info('离开房间成功');
      this.selectedStream = null;
      this.localStreams = [];
      this.remoteStreams = [];
      this.isJoinedRoom = false;
    }, (err) => {
      console.error('离开房间失败：', err);
    });
  }
  handleSelectStream(stream) {
    console.log('select stream: ', stream);
    this.selectedStream = stream;
  }
}
