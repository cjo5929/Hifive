package com.ssafy.hifive.domain.fanmeeting.dto.response;

import java.time.LocalDateTime;

import com.ssafy.hifive.domain.creator.entity.Creator;
import com.ssafy.hifive.domain.fanmeeting.entity.Fanmeeting;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class FanmeetingLatestDto {

	private long fanmeetingId;
	private String title;
	private String creatorName;
	private LocalDateTime startTime;

	public static FanmeetingLatestDto from(Fanmeeting fanmeeting, Creator creator) {
		return new FanmeetingLatestDto(
			fanmeeting.getFanmeetingId(),
			fanmeeting.getTitle(),
			creator.getCreatorName(),
			fanmeeting.getStartDate()
		);
	}
}
