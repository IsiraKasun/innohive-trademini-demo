package com.innohive.backendjava.repository;

import com.innohive.backendjava.model.Competition;
import com.innohive.backendjava.model.Participant;
import com.innohive.backendjava.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Map;
import java.util.Optional;

public interface ParticipantRepository extends JpaRepository<Participant, Long> {

    long countByCompetition(Competition competition);

    Optional<Participant> findByCompetitionAndUser(Competition competition, User user);

    @Query("select p from Participant p join fetch p.user where p.competition = :competition")
    List<Participant> findByCompetition(@Param("competition") Competition competition);

    List<Participant> findByUser(User user);

    /**
     * Bulk count of participants per competition to avoid N+1 count queries.
     * Returns rows of [competitionId, count].
     */
    @Query("select p.competition.id, count(p) from Participant p where p.competition in :competitions group by p.competition.id")
    List<Object[]> countByCompetitionIn(@Param("competitions") List<Competition> competitions);
}
