package com.ssafy.hifive.domain.openvidu.dto.request;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@AllArgsConstructor
@NoArgsConstructor
public class OpenViduRecordStopDto {
	private String recordId;
	private int sequence;
}
