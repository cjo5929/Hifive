package com.ssafy.hifive.domain.story.entity;

import com.ssafy.hifive.domain.fanmeeting.entity.Fanmeeting;
import com.ssafy.hifive.domain.member.entity.Member;
import com.ssafy.hifive.global.entity.BaseTimeEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "story")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Story extends BaseTimeEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private long storyId;

	@ManyToOne
	@JoinColumn(name = "fanmeeting_id", nullable = false)
	private Fanmeeting fanmeeting;

	@ManyToOne
	@JoinColumn(name = "fan_id", nullable = false)
	private Member fan;

	@Column(nullable = false)
	private String content;

	@Column(name = "is_picked", nullable = false)
	private boolean isPicked;

	@Column(nullable = false, length = 30)
	private String title;

	public void updateStory(String title, String content) {
		this.title = title;
		this.content = content;
	}

	@Builder
	private Story(Fanmeeting fanmeeting, Member fan, String content, String title, boolean isPicked) {
		this.fanmeeting = fanmeeting;
		this.fan = fan;
		this.content = content;
		this.isPicked = isPicked;
		this.title = title;
	}

	public void toggleIsPicked() {
		this.isPicked = !this.isPicked;
	}
}
